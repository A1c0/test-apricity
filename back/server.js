const R = require('ramda');
const sq = require('sqlite3');
const express = require('express');

const app = express();
app.use(express.json());

const db = new sq.Database('./us-census.db');
sq.verbose();

const getDataFromSqlQuery = query =>
  new Promise((resolve, reject) => {
    db.all(query, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const getColumnName = () =>
  R.pipe(
    getDataFromSqlQuery,
    R.then(R.map(R.prop('name')))
  )('PRAGMA table_info(census_learn_sql)');

const getMetricFromColumn = columnName =>
  getDataFromSqlQuery(
    `SELECT ${columnName} as "value", count(*) as "count", AVG(age) as "average age"
    FROM census_learn_sql
    GROUP BY ${columnName}
    ORDER BY count DESC`
  );

app.get('/getVariableNames', async function(req, res) {
  res.send(await getColumnName());
});

const isLimitReached = limit =>
  R.pipe(
    R.length,
    R.lt(limit)
  );

const getNotDisplayedMetrics = R.pipe(
  R.applySpec({
    'non-displayed-values': R.length,
    'non-displayed-lines': R.pipe(
      R.map(R.prop('count')),
      R.sum
    )
  })
);

const limitDataSent = limit =>
  R.pipe(
    R.when(
      isLimitReached(limit),
      R.pipe(
        R.splitAt(limit),
        R.over(R.lensIndex(1), getNotDisplayedMetrics),
        R.zipObj(['displayData', 'notDisplayData'])
      )
    )
  );

app.post('/getMetricFromColumn', async function(req, res) {
  const response = await getMetricFromColumn(req.body.column);
  if (req.body.max) res.send(limitDataSent(req.body.max)(response));
  else res.send(response);
});

app.listen(3000, function() {});
