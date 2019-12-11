const express = require("express");
const { fetchUrl } = require("fetch");
const { App } = require("@octokit/app");
const { request } = require("@octokit/request");
require("dotenv").config();

const PORT = 3000;
const APP_ID = process.env.APP_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const app = new App({ id: APP_ID, privateKey: PRIVATE_KEY });
//console.log("========", APP_ID, PRIVATE_KEY);
const jwt = app.getSignedJsonWebToken();
console.log("========", jwt);
let installationAccessToken = "";
const authenticateApp = async () => {
  const { data } = await request(
    "GET /repos/hdhami/bootstrap-gh-app/installation",
    {
      owner: "hdhami",
      repo: "bootstrap-gh-app",
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: "application/vnd.github.machine-man-preview+json"
      }
    }
  );

  // contains the installation id necessary to authenticate as an installation
  const installationId = data.id;

  installationAccessToken = await app.getInstallationAccessToken({
    installationId
  });
};

authenticateApp();

const SmeeClient = require("smee-client");

const smee = new SmeeClient({
  source: "https://smee.io/rBQMDQL63UhO9tQ",
  target: `http://localhost:${PORT}/ghevents`,
  logger: console
});

const events = smee.start();

const server = express();
const router = express.Router();

server.use(express.json()); // Instead of body-parser
server.use(express.urlencoded()); // Instead of body-parser
server.use(function(req, res, next) {
  // Allow CORS if you want.
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

server.use("/ghevents", router);

router.post("/", (req, res, next) => {
  const is_pull_req = req.headers["x-github-event"] === "pull_request";
  const pr_url = is_pull_req ? req.body.pull_request.comments_url : "";
  const options = {
    headers: {
      authorization: `token ${installationAccessToken}`,
      accept: "application/vnd.github.machine-man-preview+json"
    },
    method: "POST",
    payload: JSON.stringify({
      body: "Thanks for creating a pull request!!"
    })
  };

  if (is_pull_req) {
    console.log("=====fetching=======");
    fetchUrl(pr_url, options, (error, meta, body) => {
      console.log(body.toString());
    });
  }
  res.end();
});

server.listen(PORT, () => {
  console.log("server is listening on port=====", PORT);
});
