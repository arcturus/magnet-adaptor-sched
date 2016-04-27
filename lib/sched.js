const request = require('superagent');
const nocache = require('superagent-no-cache');
const cheerio = require('cheerio');
const url = require('url');
const debug = require('debug')('magnet-adaptor-sched:parser');

function fetch(url) {
  return new Promise((resolve, reject) => {
    request.get(url)
      .use(nocache)
      .end((err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.text);
      });
  });
}

function getDocument(html) {
  const doc = cheerio.load(html);
  return Promise.resolve(doc);
}

function Venue(url) {
  debug(url);
  this.url = url;
}

Venue.prototype.parse = function() {
  return this.parseLight();
};

Venue.prototype.getLink = function(absolutePath) {
  return url.resolve(this.url, absolutePath);
};

Venue.prototype.parseLight = function() {
  return fetch(this.url)
    .then(getDocument)
    .then(($) => {
      // Event title
      var title = $('title').text();
      title = title.substr(0, title.indexOf(':'));
      // Venue
      const venue = $('#sched-page-home-breadcrumb strong').text();

      // Date, just parse the next day
      const dateElem = $('.sched-container-header');
      const date = new Date(dateElem.attr('id'));

      // Parse events for the next day
      var evt = $('.sched-container-top');
      evt = evt !== null ? evt.next() : null;
      var events = [];
      while (evt && !evt.hasClass('sched-container-bottom')) {
        // Parse two siblings first one for time and second for
        // name and link.
        var time = evt[0].children[0].data;

        evt = evt.next();
        // Hack to get the current sched-container div
        var container = $(evt.children()[0]);
        container.find('a').toArray().forEach((a) => {
          a = $(a);
          var link = this.getLink(a.attr('href'));
          var title = a[0].children[0].data;
          events.push({
            time,
            title,
            link,
          });
        });

        // Continue parsing for next events in the venue
        evt = evt.next();
      }

      // Limit the number of next events to a maximun of 3
      events = events.slice(0, 3);

      return {
        title,
        venue,
        date,
        events,
      };
    });
};

const SchedModule = {
  venue: Venue,
};

module.exports = SchedModule;