import mongoose from "mongoose";
import payos from "../../libs/payOS.js";
import Order from "../../models/order.model.js";
import Coupon from "../../models/coupon.model.js";
import User from "../../models/user.model.js";
import Notification from "../../models/notification.model.js";
import { encryptData, decryptData } from "../../utils/security.js";
import { SHIPPING_COST } from "../../utils/constants/index.js";
import pusher from "../../utils/pusher.js";

export const createPaymentLink = async (req, res) => {
  try {
    // Lấy dữ liệu từ yêu cầu
    const paymentData = req.body;
    const totalAmountBeforeDiscount = paymentData.order_products.reduce(
      (acc, curr) =>
        acc + curr.quantity * ((curr.unit_price * (100 - curr.discount_percent)) / 100),
      0
    );
    // Lấy thông tin khuyến mãi
    const { freeShippingCoupon, orderDiscountCoupon } = await extractCouponsFromHashedIds(
      paymentData.applied_coupons,
      totalAmountBeforeDiscount
    );
    const shippingDiscount = Math.min(freeShippingCoupon?.discount_amount || 0, SHIPPING_COST);
    const orderDiscount = Math.min(
      orderDiscountCoupon?.discount_amount || 0,
      totalAmountBeforeDiscount
    );

    // Tính toán chi phí cuối cùng
    const finalCost = Math.round(
      totalAmountBeforeDiscount + SHIPPING_COST - shippingDiscount - orderDiscount
    );

    // Nếu phương thức thanh toán là COD, không tạo liên kết thanh toán
    if (paymentData.payment_method === "cod") {
      const newOrder = new Order({
        ...paymentData,
        order_products: paymentData.order_products.map((product) => {
          return {
            ...product,
            product_id: new mongoose.Types.ObjectId(
              decryptData(decodeURIComponent(product.product_hashed_id))
            ),
          };
        }),
        final_cost: finalCost,
        payment_method: "cod",
        free_shipping_coupon: freeShippingCoupon,
        order_coupon: orderDiscountCoupon,
      });
      await newOrder.save();
      // trừ khuyến mãi
      await decreaseCouponStock([freeShippingCoupon, orderDiscountCoupon]);

      // Xóa sản phẩm khỏi giỏ hàng nếu mua từ giỏ hàng
      if (paymentData.from_cart && paymentData.user_id) {
        await removePurchasedItemsFromCart(paymentData.user_id, paymentData.order_products);
      }
      await sendOrderNotification(newOrder);

      return res.status(200).json({
        message: "Order created successfully without payment link",
        orderId: encryptData(newOrder._id.toString()),
      });
    }

    // Nếu phương thức thanh toán là "onl", tạo liên kết thanh toán
    if (paymentData.payment_method === "onl") {
      const newOrderCode = Date.now() + Date.now();
      const order = {
        orderCode: paymentData.re_payment
          ? newOrderCode
          : Number(paymentData.order_id.split(".")[0].slice(3)),
        amount: finalCost,
        description: `Đơn hàng ${
          paymentData.re_payment ? newOrderCode : (paymentData.order_id.split(".") || ["unknow"])[0]
        }`,
        buyerName: paymentData.order_buyer.name,
        buyerPhone: paymentData.order_buyer.phone_number,
        buyerAddress: `${paymentData?.order_buyer?.address?.street || "Street"}, ${
          paymentData?.order_buyer?.address?.ward || "Ward"
        }, ${paymentData?.order_buyer?.address?.district || "District"}, ${
          paymentData?.order_buyer?.address?.province || "Province"
        }`,
        cancelUrl: paymentData.cancel_url,
        returnUrl: paymentData.return_url,
      };

      // Gọi API PayOS để tạo liên kết thanh toán
      const paymentLink = await payos.createPaymentLink(order);

      // Kiểm tra nếu không trả về liên kết
      if (!paymentLink || !paymentLink.checkoutUrl) {
        return res.status(500).json({ error: "Failed to generate payment link" });
      }

      if (!paymentData.re_payment) {
        const newOrder = new Order({
          ...paymentData,
          order_products: paymentData.order_products.map((product) => {
            return {
              ...product,
              product_id: new mongoose.Types.ObjectId(
                decryptData(decodeURIComponent(product.product_hashed_id))
              ),
            };
          }),
          final_cost: finalCost,
          payment_link: paymentLink.checkoutUrl,
          payment_method: "onl",
          freeShippingCoupon: freeShippingCoupon,
          orderDiscountCoupon: orderDiscountCoupon,
        });
        await newOrder.save();
        // trừ khuyến mãi
        await decreaseCouponStock([freeShippingCoupon, orderDiscountCoupon]);

        // Xóa sản phẩm khỏi giỏ hàng nếu mua từ giỏ hàng
        if (paymentData.from_cart && paymentData.user_id) {
          await removePurchasedItemsFromCart(paymentData.user_id, paymentData.order_products);
        }

        await sendOrderNotification(newOrder);
      } else {
        await Order.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(paymentData._id) },
          {
            order_status: "unpaid",
            payment_link: paymentLink.checkoutUrl,
            order_id: `DH${order.orderCode}.${paymentData.order_id.split(".")[1]}`,
          },
          { new: true }
        );
      }

      // Trả về chuỗi HTML chứa iframe
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment</title>
        </head>
        <body style="margin:0;padding:0;overflow:hidden;">
          <iframe src="${paymentLink.checkoutUrl}" frameborder="0" style="width:100%;height:100vh;border:none;"></iframe>
        </body>
        </html>
      `;

      if (paymentData.mobile)
        // Gửi HTML tới client
        return res.status(201).send(htmlContent);

      return res
        .status(201)
        .json({ checkoutUrl: paymentLink.checkoutUrl, message: "Payment link created" });
    }

    // Trường hợp phương thức thanh toán không hợp lệ
    return res.status(400).json({ error: "Invalid payment method" });
  } catch (error) {
    console.error("Error creating payment link:", error);
    res.status(500).json({ error: "An error occurred while creating the payment link" });
  }
};

export const handlePaymentWebhook = async (req, res) => {
  try {
    // console.log("webhookData1", req.body);

    // Validate required fields
    if (!req.body || !req.body.data || !req.body.signature) {
      // console.error("Invalid webhook data:", req.body);
      return res.status(400).json({ message: "Invalid webhook data" });
    }

    // Verify webhook signature
    let webhookData;
    try {
      webhookData = payos.verifyPaymentWebhookData(req.body);
    } catch (err) {
      console.error("Error verifying webhook signature:", err);
      return res.status(400).json({ message: "Invalid signature" });
    }

    console.log("webhookData2", webhookData);

    if (!webhookData) return res.status(400).json({ message: "Invalid webhook data" });

    // console.log("Webhook received:", webhookData);

    // Construct regex-based filter
    const orderFilter = { order_id: { $regex: webhookData.orderCode, $options: "i" } };

    // Process order based on success
    const update =
      webhookData.code == "00" ? { order_status: "delivering" } : { order_status: "unpaid" };

    const order = await Order.findOneAndUpdate(orderFilter, update, { new: true });

    if (!order) {
      console.error("Order not found for orderCode:", webhookData.orderCode);
      return res.status(404).json({ message: "Order not found" });
    }

    // console.log(
    //   webhookData.code == "00" ? "Order updated successfully:" : "Order update failed:",
    //   order
    // );
    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ message: "Error processing webhook" });
  }
};

export const getPaymentLink = async (req, res) => {
  try {
    // Lấy orderCode từ yêu cầu
    const { orderCode } = req.params;
    const { mobile } = req.query;

    if (!orderCode) {
      return res.status(400).json({ error: "Order code is required" });
    }

    // Tìm đơn hàng dựa trên orderCode
    const order = await Order.findOne({ order_id: { $regex: orderCode, $options: "i" } });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Kiểm tra xem đơn hàng có liên kết thanh toán không
    if (!order.payment_link) {
      return res.status(404).json({ error: "Payment link not found for this order" });
    }

    // Trả về chuỗi HTML chứa iframe
    const htmlContent = `
     <!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Payment</title>
     </head>
     <body style="margin:0;padding:0;overflow:hidden;">
       <iframe src="${order.payment_link}" frameborder="0" style="width:100%;height:100vh;border:none;"></iframe>
     </body>
     </html>
   `;

    if (mobile)
      // Gửi HTML tới client
      return res.status(200).send(htmlContent);

    return res
      .status(200)
      .json({ checkoutUrl: order.payment_link, message: "Get payment link successfully" });
  } catch (error) {
    console.error("Error fetching payment link:", error);
    res.status(500).json({ error: "An error occurred while fetching the payment link" });
  }
};

const removePurchasedItemsFromCart = async (userId, orderProducts) => {
  try {
    // Lấy giỏ hàng của user trước khi xóa
    const variantIds = orderProducts.map((p) => new mongoose.Types.ObjectId(p.variant_id));

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $pull: {
          user_cart: {
            variant_id: { $in: variantIds },
          },
        },
      }
    );
  } catch (error) {
    console.error("Error removing purchased items from cart:", error);
  }
};

const sendOrderNotification = async (order) => {
  // Create the notification in MongoDB
  const newNotification = await Notification.create({
    userId: order.user_id,
    type: "order",
    title: "New Order Received",
    message: `Order #${order.order_id} has been placed and is awaiting payment`,
    read: false,
    actionUrl: `/admin/orders/${order._id}`,
  });

  // Gửi notification tới tất cả admin qua Pusher
  await pusher.trigger("orders", "orderNotification", newNotification);
};

const extractCouponsFromHashedIds = async (hashedIds = [], totalAmount = 0) => {
  if (!Array.isArray(hashedIds) || hashedIds.length === 0) {
    return { freeShippingCoupon: null, orderDiscountCoupon: null };
  }

  let freeShippingCoupon = null;
  let orderDiscountCoupon = null;

  const coupons = await Promise.all(
    hashedIds.map(async (hashedId) => {
      try {
        const decodedId = decryptData(decodeURIComponent(hashedId));
        return await Coupon.findById(decodedId);
      } catch (err) {
        console.error("Failed to decode or find coupon:", err);
        return null;
      }
    })
  );

  for (const coupon of coupons) {
    if (!coupon) continue;

    const discountAmount = calculateCouponDiscount(coupon, totalAmount);

    const couponData = {
      coupon_id: coupon._id,
      coupon_name: coupon.coupon_name,
      discount_amount: discountAmount,
    };

    if (coupon.coupon_type === "Free Ship") {
      freeShippingCoupon = couponData;
    } else if (coupon.coupon_type === "Order") {
      orderDiscountCoupon = couponData;
    }
  }

  return { freeShippingCoupon, orderDiscountCoupon };
};
// utils/coupon.js
const calculateCouponDiscount = (coupon, totalAmount) => {
  if (!coupon || !coupon.active) return 0;

  if (coupon.coupon_condition > 0 && totalAmount < coupon.coupon_condition) return 0;

  if (coupon.coupon_unit === "đ") {
    return Math.min(coupon.coupon_value, totalAmount);
  }

  if (coupon.coupon_unit === "%") {
    const discount = (coupon.coupon_value / 100) * totalAmount;
    return Math.min(discount, coupon.coupon_max_value || discount);
  }

  return 0;
};

const decreaseCouponStock = async (coupons) => {
  const usedCoupons = coupons.filter(Boolean); // loại bỏ null hoặc undefined

  if (!usedCoupons.length) return;

  await Promise.all(
    usedCoupons.map((coupon) =>
      Coupon.findByIdAndUpdate(
        coupon.coupon_id,
        { $inc: { coupon_stock_quantity: -1 } },
        { new: true }
      )
    )
  );
};
