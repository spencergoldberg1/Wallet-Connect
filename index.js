const express = require("express");
const path = require("path");
const cors = require("cors");
const { XummSdkJwt } = require("xumm-sdk");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();
const bodyParser = require("body-parser");

const app = express();

// Use CORS with default settings
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json())

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Wallet connection routes
app.get("/", (req, res) => {
  res.render("LandingPage.ejs")
});

// Wallet connection routes
app.get("/wallet_connect/evm", (req, res) => {
  res.render("walletconnect.ejs");
});

app.post("/wallet_connect/evm", (req, res) => {
  res.render("wallet_address_result.ejs", {wallet_address: req.body.wallet_address});
});

app.get("/wallet_connect/xrp", (req, res) => {
  res.render("xrp_walletconnect.ejs");
});

app.post("/wallet_connect/xrp", (req, res) => {
 
  res.render("wallet_address_result", {wallet_address: req.body.xrpAddress})
});

// XUMM OAuth initiation
app.get("/xumm/sign_in", (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/xrp_sign-in/xumm/complete`;
  const responseType = "token";
  const oauthUrl = `https://oauth2.xumm.app/auth?client_id=${
    process.env.XUMM_API_KEY
  }&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=${responseType}`;

  if (!process.env.XUMM_API_KEY) {
    console.error("XUMM API Key is not configured.");
    res.status(500).send("Internal Server Error: XUMM API Key is missing.");
    return;
  }

  console.log("Redirecting to OAuth URL:", oauthUrl);
  res.redirect(oauthUrl);
});

// XUMM OAuth completion and payload processing
app.get("/xrp_sign-in/xumm/complete", async (req, res) => {
  const accessToken = req.query.access_token;

  if (!accessToken) {
    return res.status(400).send("Access token is required.");
  }

  try {
    const sdk = new XummSdkJwt(accessToken);
    const signPayload = {
      txjson: { TransactionType: "SignIn" },
      options: { submit: false, expire: 60 },
    };

    const payloadResponse = await sdk.payload.create(signPayload);
    const payloadUrl = `https://xumm.app/api/v1/platform/payload/${payloadResponse.uuid}`;

    const response = await axios.get(payloadUrl, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": process.env.XUMM_API_KEY,
        "X-API-Secret": process.env.XUMM_API_SECRET,
      },
    });

    const accountData = response.data.response.account;
    if (!accountData) {
      throw new Error(
        "Account information is unavailable or the token has expired."
      );
    }

    res.render("wallet_address_result", { wallet_address: accountData });
  } catch (error) {
    console.error("Error during OAuth completion:", error);
    res.render("error");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
