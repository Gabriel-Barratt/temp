const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': '6467d27cb955b5001342254e',
      'PLAID-SECRET': 'd2ca82fd498a55a639c8a6768c5e7e',
      'Plaid-Version': '2020-09-14',
    },
  },
});

const plaidClient = new PlaidApi(configuration);

app.post('/plaid_exchange', async (req, res) => {
  try {
    const public_token = req.body.public_token;
    const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = tokenResponse.data.access_token;
    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    console.log(accountsResponse.data.accounts);
    res.sendStatus(200);
  } catch (error) {
    const err = error.response.data;
    console.error('/exchange token returned an error', {
      error_type: err.error_type,
      error_code: err.error_code,
      error_message: err.error_message,
      display_message: err.display_message,
      documentation_url: err.documentation_url,
      request_id: err.request_id,
    });
    // Handle the error in your application
    switch (err.error_type) {
      case 'INVALID_REQUEST':
        // ...
        break;
      case 'INVALID_INPUT':
        // ...
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // ...
        break;
      case 'API_ERROR':
        // ...
        break;
      case 'ITEM_ERROR':
        // ...
        break;
      default:
        // fallthrough
    }
    res.sendStatus(500);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const webhookPayload = req.body;
    const bankAccountNumber = webhookPayload.event.data.column_values.find(
      (column) => column.title === 'Bank Account Number'
    ).text;
    // Extract other necessary data from the payload

    const plaidResponse = await plaidClient.getBalance(bankAccountNumber, { access_token: linkToken });
    const balance = plaidResponse.accounts[0].balances.current;

    await axios.put(
      'https://api.monday.com/v2/boards/4515571876/pulses/4515571922/column_values/text4',
      { value: balance },
      {
        headers: {
          Authorization: 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjI1ODI0OTkwNiwiYWFpIjoxMSwidWlkIjo0MzQzNDQwMSwiaWFkIjoiMjAyMy0wNS0yM1QxOTozMzo0OS4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTY0NDE3MDAsInJnbiI6InVzZTEifQ.kFpAlyBr1rfrNGBWJfHfYs9PRy7YiOr0k4ivP20WPoU',
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).end();
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).end();
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});