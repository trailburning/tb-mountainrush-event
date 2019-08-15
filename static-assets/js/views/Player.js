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

    getFundraising: function(callback){
      var self = this;

      // now go and get live data
      var url = GAME_API_URL + 'game/' + this.options.gameID + "/player/" + this.model.get('id') + '/fundraiser/details';
//      console.log(url);

      $.getJSON(url, function(result){
        if (result) {
          // callback
          callback(result);
        }
        else {
          console.log('getFundraising:ERR');
        }
      });
    },

    getLatestDetails: function(){
      var self = this;

      var url = GAME_API_URL + 'player/' + this.model.get('id') + '/update';
//      console.log(url);
      $.getJSON(url, function(result){
//        console.log(result);
      });
    }
  });

  return Player;
});
