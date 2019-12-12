const express = require("express");
const { fetchUrl } = require("fetch");
const { App } = require("@octokit/app");
const fs = require("fs");
require("dotenv").config();

const PORT = 3000;
const APP_ID = process.env.APP_ID;
//const PRIVATE_KEY = fs.readFileSync("./test-bot-gh-3.2019-12-11.private-key.pem").toString();
const PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const app = new App({ id: APP_ID, privateKey: PRIVATE_KEY });
const jwt = app.getSignedJsonWebToken();
let installationAccessToken = "";
const authenticateApp = async app => {
  console.log("=======jwt=======", jwt);

  fetchUrl(
    "https://api.github.com/app/installations",
    {
      owner: "@hdhami",
      repo: "test-bot-gh-3",
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: "application/vnd.github.machine-man-preview+json"
      }
    },
    async (error, meta, body) => {
      const installationId = JSON.parse(body)[0].id;
      console.log("=======installationId===========", installationId);
      installationAccessToken = await app.getInstallationAccessToken({
        installationId
      });
      console.log("===installationAccessToken===", installationAccessToken);
    }
  );
};

authenticateApp(app);

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
  console.log("======pr-url", pr_url);
  console.log("=======token=======", installationAccessToken);

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
      console.log(232324);
      console.log(body.toString());
    });
  }
  res.end();
});

server.listen(PORT, () => {
  console.log("server is listening on port=====", PORT);
});
