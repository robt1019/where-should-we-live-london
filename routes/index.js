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

  console.log(results);

  res.render("results", { data: results });
});

module.exports = router;
