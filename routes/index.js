var express = require("express");
const { getResults } = require("../journey-response-mapper");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index");
});

router.get("/get-results", async function (req, res, next) {
  const locations = Object.values(req.query).filter((v) => !!v);

  const results = await getResults(locations);

  if (results[0]?.length === 0) {
    res.render("error", {
      message: "Sorry that did not work. Please try again in a minute!",
      error: {},
    });
  } else {
    res.render("results", { data: results });
  }
});

module.exports = router;
