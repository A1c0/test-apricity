const R = require('ramda');
const sq = require('sqlite3');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = new sq.Database(__dirname + '/us-census.db');
sq.verbose();

const getDataFromSqlQuery = R.curry(
  (db, query) =>
    new Promise((resolve, reject) => {
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
);

const getColumnName = db =>
  R.pipe(
    getDataFromSqlQuery(db),
    R.then(R.map(R.prop('name')))
  )('PRAGMA table_info(census_learn_sql)');

const getMetricsFromColumn = R.curry((db, columnName) =>
  getDataFromSqlQuery(
    db,
    `SELECT "${columnName}" as "value", count(*) as "count", AVG(age) as averageAge
    FROM census_learn_sql
    GROUP BY "${columnName}"
    ORDER BY count DESC`
  )
);

const isLimitReached = limit =>
  R.pipe(
    R.length,
    R.lt(limit)
  );

const getNonDisplayedMetrics = R.pipe(
  R.applySpec({
    nonDisplayedValues: R.length,
    nonDisplayedLines: R.pipe(
      R.map(R.prop('count')),
      R.sum
    )
  })
);

const limitDataSent = (limit, data) =>
  R.pipe(
    R.ifElse(
      isLimitReached(limit),
      R.pipe(
        R.splitAt(limit),
        R.over(R.lensIndex(1), getNonDisplayedMetrics),
        R.zipObj(['displayData', 'nonDisplayData'])
      ),
      R.pipe(
        R.objOf('displayData'),
        R.assoc('nonDisplayData', {
          nonDisplayedValues: 0,
          nonDisplayedLines: 0
        })
      )
    )
  )(data);

app.get('/getVariableNames', async function(req, res) {
  res.send(await getColumnName(db));
});

app.post('/getMetricFromColumn', async function(req, res) {
  const response = await getMetricsFromColumn(db, req.body.column);
  if (req.body.max) res.send(limitDataSent(req.body.max, response));
  else res.send(response);
});

app.listen(3000, function() {});
