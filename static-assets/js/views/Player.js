var MEASUREMENT_METRIC = 0;
var MEASUREMENT_IMPERIAL = 1;

var METRIC_SHORT = 'm';
var METRIC_LONG = 'km';

var IMPERIAL_SHORT = 'ft';
var IMPERIAL_LONG = 'mi.';

var METRE_TO_FOOT = 3.28084;
var KM_TO_MILE = 0.621371;

var DEF_NUM_PHOTOS_TO_SHOW = 6;

define([
  'underscore', 
  'backbone',
  'moment',
  'views/FundraisingDonationSummaryView',
  'views/FundraisingDonationsView',
  'views/PlayerActivityCommentView',
  'views/PlayerActivityMorePhotosView',
  'views/PlayerActivityPhotosView',
  'views/PlayerActivityPhotoView'
], function(_, Backbone, moment, FundraisingDonationSummaryView, FundraisingDonationsView, PlayerActivityCommentView, PlayerActivityMorePhotosView, PlayerActivityPhotosView, PlayerActivityPhotoView){

  var Player = Backbone.View.extend({
    initialize: function(options){
      app.dispatcher.on("PlayerActivityPhotosView:loaded", this.onPlayerActivityPhotosLoaded, this);
      app.dispatcher.on("PlayerActivityMorePhotosView:click", this.onPlayerActivityMorePhotosClick, this);

      this.options = options;
      this.jsonProgress = null;
      this.jsonFundraisingPage = null;
      this.jsonDonations = null;
      this.bMorePhotosBtnNotShow = false;
      this.nCurrPhotoActivity = 0;
      this.currPhotoActivityId = null;
      this.currPlayerActivityPhotosView = null;
      this.bFundraisingLoaded = false;
      this.bDonationsLoaded = false;
      this.bCommentsLoaded = false, this.bPhotosLoaded = false;
      this.elPlayerSummary = null;
      this.elPlayerList = null;
      this.elPlayerDetail = null;
      this.playerActivityMorePhotosView = null;
    },

    create: function(){
      var self = this;

      var jsonData = {avatar: 'none',
                      firstname: 'Fred',
                      lastname: 'Blogs',
                      email: 'me@me.com',
                      city: 'this one',
                      country: 'world'};

      var url = GAME_API_URL + "player";
//      console.log(url);
      $.ajax({
        type: 'post',
        dataType: 'json',
        url: url,
        data: JSON.stringify(jsonData),
        error: function(data) {
          console.log('error');
          console.log(data);
        },
        success: function(data) {
          console.log('success');
          console.log(data);
        }
      });
    },

    getProgress: function(callback){
      var self = this;

      var url = GAME_API_URL + 'game/' + this.options.gameID + '/player/' + this.model.get('id') + '/progress';
//      console.log(url);
      $.getJSON(url, function(result){
        self.jsonProgress = result[0];

        self.model.set('measurement_adjustment', 0);
        self.model.set('measurement_shortname', METRIC_SHORT);
        self.model.set('measurement_longname', METRIC_LONG);

        self.model.set('activities', self.jsonProgress.activities);

        var fDistance = 0, fElevationGain = 0;
        $.each(self.jsonProgress.activities, function(index, activity){
//          console.log(activity);
          var dtStartDate = new Date(activity.start_date);
          activity.start_date_ago = moment(dtStartDate).fromNow();

          fDistance += Number(activity.distance);
          fElevationGain += Number(activity.total_elevation_gain);
        });

        if (TEST_PROGRESS) {
          if (TEST_PROGRESS == 100) {
            fElevationGain = self.options.journeyAscent;
          }
        }

        self.model.set('mediaCaptured', self.jsonProgress.bMediaCaptured == '1' ? true : false);
        // calc progress
        var fAscentPercent = (fElevationGain / self.options.journeyAscent) * 100;
        self.model.set('elevationGainPercent', fAscentPercent);

        self.model.set('distance', fDistance);
        self.model.set('elevationGain', fElevationGain);

        var fElevationToSummit = 0;
        if (fElevationGain < self.options.journeyAscent) {
          fElevationToSummit = self.options.journeyAscent - fElevationGain;
        }

        self.model.set('elevationToSummit', fElevationToSummit);

        // contains date player reached ascent, if they did that is
        self.model.set('ascentCompleted', self.jsonProgress.ascentCompleted);

        // set fundraising details
        self.model.set('fundraisingCurrencySymbol', self.jsonProgress.fundraising_currency_symbol);

        // callback
        callback(self.model);
      });
    },

    getLatestDetails: function(){
      var self = this;

      var url = GAME_API_URL + 'player/' + this.model.get('id') + '/update';
//      console.log(url);
      $.getJSON(url, function(result){
//        console.log(result);
      });
    },

    getFundraising: function(){
      if (this.bFundraisingLoaded) {
        return;
      }
      this.bFundraisingLoaded = true;

      var self = this;

      // first render with cached donation info
      var jsonFields = {totalRaisedPercentageOfFundraisingTarget: (this.model.get('fundraising_raised') / this.model.get('fundraising_goal')) * 100,
                        currencySymbol: this.model.get('fundraisingCurrencySymbol'),
                        totalRaisedOnline: this.model.get('fundraising_raised'),
                        fundraisingTarget: this.model.get('fundraising_goal'),
                        playerID: self.model.get('id'),
                        fundraisingPageID: self.model.get('fundraising_pageID')
                        }

      this.summaryFundraisingDonationSummaryView = new FundraisingDonationSummaryView({ el: $('.fundraising-donation-summary-view', self.elPlayerSummary) });
      this.summaryFundraisingDonationSummaryView.render(jsonFields);

      this.detailFundraisingDonationSummaryView = new FundraisingDonationSummaryView({ el: $('.fundraising-donation-summary-view', self.elPlayerDetail) });
      this.detailFundraisingDonationSummaryView.render(jsonFields);

      // now go and get live data
      var url = GAME_API_URL + 'game/' + this.options.gameID + "/player/" + this.model.get('id') + '/fundraiser/details';
      if (FUNDRAISING_PROVIDER == FUNDRAISING_PROVIDER_JUSTGIVING) {
        if (this.jsonProgress.fundraising_page) {
          url = GAME_API_URL + 'game/' + this.options.gameID + "/player/" + this.model.get('id') + '/fundraiser/page/' + this.jsonProgress.fundraising_page;
        }
      }
//      console.log(url);

      $.getJSON(url, function(result){
        if (result) {
          self.jsonFundraisingPage = result;
          self.jsonFundraisingPage.playerID = self.model.get('id');
          self.jsonFundraisingPage.fundraisingPageID = self.model.get('fundraising_pageID');
          if (self.jsonFundraisingPage.fundraisingTarget != undefined) {
            self.jsonFundraisingPage.totalRaisedPercentageOfFundraisingTarget = ((self.jsonFundraisingPage.totalRaisedOnline) / self.jsonFundraisingPage.fundraisingTarget) * 100;
            // render again
            self.summaryFundraisingDonationSummaryView.render(self.jsonFundraisingPage);
            self.detailFundraisingDonationSummaryView.render(self.jsonFundraisingPage);
          }
        }
        else {
          console.log('getFundraising:ERR');
        }
      });

    },

    getDonations: function(){
      if (this.bDonationsLoaded) {
        return;
      }
      this.bDonationsLoaded = true;

      var self = this;

      if (this.jsonProgress.fundraising_goal) {
        this.fundraisingDonationsView = new FundraisingDonationsView({ el: $('.fundraising-donations-view .fundraisers', self.elPlayerDetail) });

        var url = GAME_API_URL + 'game/' + this.options.gameID + "/player/" + this.model.get('id') + '/fundraiser/donations';
        if (FUNDRAISING_PROVIDER == FUNDRAISING_PROVIDER_JUSTGIVING) {
          url = GAME_API_URL + 'fundraiser/page/' + this.jsonProgress.fundraising_page + '/donations';
        }
//        console.log(url);
        $.getJSON(url, function(result){
          self.jsonDonations = result;
          if (self.jsonDonations) {
            if (FUNDRAISING_PROVIDER == FUNDRAISING_PROVIDER_JUSTGIVING) {
              if (self.jsonDonations.donations) {
                if (self.jsonDonations.donations.length) {
                  $('.with-donations', this.elPlayerDetail).show();
                  $('.without-donations', this.elPlayerDetail).hide();
                  self.fundraisingDonationsView.render(self.jsonDonations.donations);
                }
              }
            }
            else {
              if (self.jsonDonations.result.transactions) {
                if (self.jsonDonations.result.transactions.length) {
                  $('.with-donations', this.elPlayerDetail).show();
                  $('.without-donations', this.elPlayerDetail).hide();
                  self.fundraisingDonationsView.render(self.jsonDonations.result.transactions);
                }
              }
            }
          }
        });
      }
    },

    getActivityComments: function(){
      if (this.bCommentsLoaded) {
        return;
      }
      this.bCommentsLoaded = true;

      var self = this;

      var elPlayerComments = $('#players-detail-view .player[data-id="' + this.model.get('id') + '"] .activity-comment');
      var playerActivityCommentView = new PlayerActivityCommentView({ el: elPlayerComments });

      // most recent activity
      var activity = this.jsonProgress.activities[0];

      // get comments
      var url = GAME_API_URL + 'game/' + this.options.gameID + "/player/" + this.model.get('id') + '/activity/' + activity.activity + '/comments';
//      console.log(url);
      $.getJSON(url, function(result){
        if (result) {
          playerActivityCommentView.render(result);
        }
      });
    },

    getActivityPhotosByPos: function(nPos){
      this.nCurrPhotoActivity = nPos;

      var activity = this.jsonProgress.activities[nPos];
      this.currPhotoActivityId = activity.activity;

      var elPlayerPhotos = $('#players-detail-view .player[data-id="' + this.model.get('id') + '"] .posts .photos');
      var playerActivityPhotosView = new PlayerActivityPhotosView({ el: elPlayerPhotos, gameID: this.options.gameID, playerID: this.model.get('id'), activityID: activity.activity, player: this.model });
      playerActivityPhotosView.load();
    },

    getActivityPhotos: function(){
      if (this.bPhotosLoaded) {
        return;
      }

      this.bPhotosLoaded = true;
      
      this.nCurrPhotoActivity = 0;

      var elPlayerPhotos = $('#players-detail-view .player[data-id="' + this.model.get('id') + '"] .posts .photos');      
      this.playerActivityMorePhotosView = new PlayerActivityMorePhotosView({ playerID: this.model.get('id'), elParent: elPlayerPhotos });

      // check for activities
      if (this.jsonProgress.activities) {
        if (this.jsonProgress.activities.length) {
          this.getActivityPhotosByPos(this.nCurrPhotoActivity);
        }
      }
    },

    render: function(){
      this.elPlayerSummary = $('#players-summary-view .player-summary[data-id="' + this.model.get('id') + '"]');
      this.elPlayerList = $('#players-list-view .player-ranking[data-id="' + this.model.get('id') + '"]');
      this.elPlayerDetail = $('#players-detail-view .player[data-id="' + this.model.get('id') + '"]');
    },

    onPlayerActivityMorePhotosClick: function (params) {
      if (params.playerID == this.model.get('id')) {
        // show all photos
        var elPlayerPhotos = $('#players-detail-view .player[data-id="' + this.model.get('id') + '"] .posts .photos');      
        $(elPlayerPhotos).addClass('show-all');
        $('.post', elPlayerPhotos).removeClass('no-show');

        params.PlayerActivityMorePhotosView.hide();
      }
    },

    onPlayerActivityPhotosLoaded: function (playerActivityPhotosView) {
      var self = this;

      function photoRendered(playerActivityPhotosView, playerActivityPhotoView) {
        var elParent = $('#players-detail-view .player[data-id="' + self.model.get('id') + '"]');

        // no player so use page
        if (!elParent.length) {
          elParent = $('#page-view');
        }

        var elPhotos = $('.posts .photos', elParent);
        if (!self.currPhotoActivityId || (self.currPhotoActivityId == playerActivityPhotosView.activityID)) {
          var nPhotos = $('.post.active', elParent).length;

          // as we get photos we can hide the blank placeholders
          $('.post.inactive', elParent).each(function(index) {
            if (index < nPhotos) {
              $(this).hide();
            }
          });

          if (elPhotos.hasClass('show-all')) {
            playerActivityPhotoView.el.removeClass('no-show');
          }
          else {
            // show 1st photos

            if (nPhotos <= DEF_NUM_PHOTOS_TO_SHOW) {
              playerActivityPhotoView.el.removeClass('no-show');
            }
  
            if (nPhotos > DEF_NUM_PHOTOS_TO_SHOW) {
              if (self.playerActivityMorePhotosView) {
                self.playerActivityMorePhotosView.render().el;
              }
            }
          }
        }
      }

      if (this.currPhotoActivityId == playerActivityPhotosView.activityID) {
        if (playerActivityPhotosView.jsonPhotos.length) {
          this.currPlayerActivityPhotosView = playerActivityPhotosView;

          // we have some photos!
          $('.photo-icon', this.elPlayerSummary).addClass('show');
          $('.photo-icon', this.elPlayerList).addClass('show');
          $('.photo-icon', this.elPlayerDetail).addClass('show');

          $('.with-photos', this.elPlayerDetail).show();
          $('.without-photos', this.elPlayerDetail).hide();

          // render
          playerActivityPhotosView.render(photoRendered).el;
        }

        //any more?
        if ((this.nCurrPhotoActivity+1) < this.jsonProgress.activities.length) {
          this.getActivityPhotosByPos(this.nCurrPhotoActivity + 1);
        }
      }

    }
  });

  return Player;
});
