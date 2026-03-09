const handler = require('./api/matches.js');
const req = {};
const res = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log("Status:", this.statusCode);
    console.log("Result (matches 0-1):", JSON.stringify(data.matches.slice(0, 2), null, 2));
    console.log("Total Matches:", data.matchCount);
  }
};
handler(req, res).catch(console.error);
