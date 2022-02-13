const axios = require("axios");

const appId = process.env.APP_ID;
const appKey = process.env.APP_KEY;

const fastestJourneyTime = (response) => {
  const sortedJourneyTimes = response.journeys.map((j) => j.duration).sort();
  return sortedJourneyTimes[0];
};

const generateGrid = () => {
  const bottom = 51.362;
  const top = 51.616;
  const left = -0.3687;
  const right = 0.1722;

  const gridHeight = 6;
  const gridWidth = 10;

  const heightIncrement = (top - bottom) / gridHeight;
  const widthIncrement = (right - left) / gridWidth;

  const grid = [];

  let centeredPoint = [bottom, left];

  for (let i = 0; i < gridWidth; i++) {
    for (let j = 0; j < gridHeight; j++) {
      grid.push([...centeredPoint]);
      centeredPoint[0] += heightIncrement;
    }
    centeredPoint[1] += widthIncrement;
    centeredPoint[0] = bottom;
  }

  return grid;
};

const getGridJourneys = async (grid, locationsToCheck) => {
  const gridJourneys = {};

  console.log("requesting");

  let withAverageAndSpread = {};

  await axios
    .all(
      grid.map(([gridLat, gridLong]) => {
        return axios.all(
          locationsToCheck.map((location) => {
            return axios
              .get(
                `https://api.tfl.gov.uk/journey/journeyresults/${gridLat},${gridLong}/to/${location}?app_id=${appId}&app_key=${appKey}`
              )
              .then((res) => {
                const key = `${gridLat},${gridLong}`;
                if (gridJourneys[key]) {
                  gridJourneys[key].push(fastestJourneyTime(res.data));
                } else {
                  gridJourneys[key] = [fastestJourneyTime(res.data)];
                }
              })
              .catch((err) => {
                console.error(err.response.config.url);
                console.error(err.response.status);
                return err;
              });
          })
        );
      })
    )
    .then(() => {
      console.log("request done");
      withAverageAndSpread = Object.keys(gridJourneys).reduce(
        (results, gridSquare) => {
          return {
            ...results,
            [gridSquare]: {
              journeys: gridJourneys[gridSquare],
              spread: gridJourneys[gridSquare].reduce(
                (prev, curr) => {
                  const newHighest = Math.max(curr, prev.highest);
                  const newLowest = Math.min(curr, prev.lowest);

                  return {
                    highest: newHighest,
                    lowest: newLowest,
                    diff: newHighest - newLowest,
                  };
                },
                {
                  lowest: Number.MAX_SAFE_INTEGER,
                  highest: 0,
                  diff: 0,
                }
              ),
              average:
                gridJourneys[gridSquare].reduce((prev, curr) => {
                  return prev + curr;
                }, 0) / gridJourneys[gridSquare].length,
            },
          };
        },
        {}
      );
    });
  return {
    gridJourneys,
    withAverageAndSpread,
  };
};

const getResults = async (locationsToCheck) => {
  const { gridJourneys, withAverageAndSpread } = await getGridJourneys(
    generateGrid(),
    locationsToCheck
  );

  const sorted = [
    ...Object.keys(gridJourneys).sort((a, b) => {
      if (withAverageAndSpread[a].average < withAverageAndSpread[b].average) {
        return -1;
      }
      if (withAverageAndSpread[a].average === withAverageAndSpread[b].average) {
        return 0;
      }
      if (withAverageAndSpread[a].average > withAverageAndSpread[b].average) {
        return 1;
      }
    }),
  ];

  const sortedListWithDetails = sorted.map((key) => {
    return {
      location: key,
      averageJourneyTime: Math.round(withAverageAndSpread[key].average),
      spread: Math.round(withAverageAndSpread[key].spread.diff),
      journeys: withAverageAndSpread[key].journeys,
    };
  });

  return [sortedListWithDetails.slice(0, 5)];
};

module.exports = {
  getResults,
};
