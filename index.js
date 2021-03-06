const fs = require("fs");
const cheerio = require("cheerio");
const got = require("got");

const UPDATE_TEMPLATE = (name, status) => `${name} is ${status}`;
const CHANGE_TEMPLATE = (name, oldStatus, status) =>
  `Update! ${name} ${oldStatus} → ${status}`;

const PUSHOVER_API_URL = `https://api.pushover.net/1/messages.json`;

const BASE_URL = "https://www.lego.com/en-au/product/";
const RE_NAME = new RegExp(/^(LEGO®)?\s*(?<name>.*?)\s*\|.*/);

async function push(token, user, title, url, message) {
  return got.post(PUSHOVER_API_URL, {
    json: {
      token,
      user,
      message,
      title,
      url,
      priority: 1,
    },
  });
}

async function getStatusForSku(sku) {
  const productUrl = `${BASE_URL}${sku}`;
  const page = await got(productUrl);

  const $ = cheerio.load(page.body);
  const title = $("title").text();
  const match = title.match(RE_NAME);
  if (!match || !match.groups) {
    throw new Error(`Unable to match ${RE_NAME} in title ${title} for ${sku}`);
  }
  const name = match.groups.name;
  const currentStatus = $(`[data-test='product-overview-availability']`).text();
  return { name, productUrl, currentStatus };
}

async function main() {
  const skus = process.argv[2].split(",");
  try {
    const secrets = JSON.parse(fs.readFileSync("secrets.json", "utf8"));
    let state = {};
    try {
      state = JSON.parse(fs.readFileSync("state.json", "utf8"));
    } catch (err) {
      state = {
        status: null,
      };
    }

    for (sku of skus) {
      console.log(`Getting status for SKU ${sku}`);
      let status = state[sku].status || null;
      const { name,  productUrl, currentStatus } = await getStatusForSku(sku);
      if (currentStatus !== status) {
        console.log("Status change! " + currentStatus);
        push(
          secrets.PUSHOVER_TOKEN,
          secrets.PUSHOVER_USER,
          name,
          productUrl,
          CHANGE_TEMPLATE(name, status, currentStatus)
        );
      } else if (process.argv[3] === "--send-update") {
        push(
          secrets.PUSHOVER_TOKEN,
          secrets.PUSHOVER_USER,
          name,
          productUrl,
          UPDATE_TEMPLATE(name, currentStatus)
        );
      }
      console.log(`Status for ${sku} is ${currentStatus}`);
      state[sku] = { status: currentStatus };
    }

    fs.writeFileSync("state.json", JSON.stringify(state), "utf8");
  } catch (err) {
    console.error(err);
  }
}

main();