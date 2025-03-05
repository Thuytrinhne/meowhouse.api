import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "./models/user.model.js";
import { generateToken, generateRefreshToken } from "./utils/auth.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ user_email: profile.emails[0].value });
        if (!user) {
          user = new User({
            user_email: profile.emails[0].value,
            user_name: profile.displayName,
            user_password: "google-auth", // You might want to handle this differently
            is_email_verified: true,
            user_role: "User",
          });
          await user.save();
        }
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        user.refresh_token = refreshToken;
        await user.save();
        done(null, { user, token, refreshToken });
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "emails", "name"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Step 1: Check if the user already exists in the database by facebookId
        let user = await User.findOne({ facebook_id: profile.id });

        // Step 2: If user doesn't exist, create a new one
        if (!user) {
          const fullName = [
            profile.name.familyName,
            profile.name.middleName,
            profile.name.givenName,
          ]
            .filter(Boolean)
            .join(" ");
          user = new User({
            facebook_id: profile.id,
            user_name: fullName,
            user_password: "facebook-auth", // You might want to handle this differently
            user_email: profile.emails ? profile.emails[0].value : undefined,
            is_email_verified: true,
            user_role: "User",
          });
        }
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        user.refresh_token = refreshToken;
        await user.save();
        done(null, { user, token, refreshToken });
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
