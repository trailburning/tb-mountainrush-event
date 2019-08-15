var app = app || {};

var CONTROLLER_API_URL  = 'server/';

var TB_API_EXT = '';
var TB_API_URL  = 'https://api.trailburning.com/v2';
var CAMPAIGN_ID = 'djJrblYlXV';
var CAMPAIGN_TEMPLATE = 'deault';
var TEST_PROGRESS = false;

var ACTIVITY_CHECK_TIMER = 10000;
var CONTROLLER_TIMER = 500;

var STATE_FLY = 1;
var STATE_SPIN = 2;
var STATE_TOGGLE_SNOW = 3;
var STATE_GOTO_START = 4;
var STATE_GOTO_SUMMIT = 5;
var STATE_FOCUS_PLAYER = 6;

define([
  'underscore',
  'backbone',
  'bootstrap', 
  'moment',
  'countdown',
  'animateNumber',
  'turf',
  'views/Player',
  'views/ChallengeView',
  'views/Mountain3DView'
], function(_, Backbone, bootstrap, moment, countdown, animateNumber, turf, Player, ChallengeView, Mountain3DView){
  app.dispatcher = _.clone(Backbone.Events);

  _.templateSettings = {
      evaluate:    /\{\{(.+?)\}\}/g,
      interpolate: /\{\{=(.+?)\}\}/g,
      escape:      /\{\{-(.+?)\}\}/g
  };

  var initialize = function() {
    var self = this;

    app.dispatcher.on("Mountain3DView:onLocationLoaded", onLocationLoaded);
    app.dispatcher.on("Mountain3DView:onFeatureClicked", onFeatureClicked);

    var challengeView = null;
    var mountainModel = new Backbone.Model();
    var jsonPlayers = new Array;
    var playerCollection = null;
    var mountainModel = null;
    var mountainEventsCollection = null;
    var nPlayersLoaded = 0;
    var mountain3DView = null;
    var nCurrPlayer = -1;
    var fCurrProgress = 0;
    var currPlayerModel = null;
    var nCurrMarker = -1;
    var fProgressKM = 0;
    var bShowingSnow = false;
    var dtStateCreated = null;

    function handleResize(bReset) {
      var nWindowHeight = $(window).height();

      $('#map-view').addClass('full-height');
      $('#map-view.full-height .map').css('height', nWindowHeight);
    }

    function handleControllerState(nState) {
      switch (nState) {
        case STATE_FLY:
          mountain3DView.playRoute();
          break;

        case STATE_SPIN:
          mountain3DView.spin();
          break;

        case STATE_TOGGLE_SNOW:
          if (bShowingSnow) {
            mountain3DView.setSeason(SEASON_SUMMER_EUROPE);
          }
          else {
            mountain3DView.setSeason(SEASON_WINTER_EUROPE);            
          }
          bShowingSnow = !bShowingSnow;
          break;

        case STATE_GOTO_START:
          mountain3DView.selectPoint(0);
          break;

        case STATE_GOTO_SUMMIT:
          mountain3DView.selectFlag();
          break;

        case STATE_FOCUS_PLAYER:
          mountain3DView.selectPlayer(currPlayerModel.get('playerObj').model.get('id'));
          break;
      }
    }

    function getControllerState() {
      var url = CONTROLLER_API_URL + "controlstate";
//      console.log(url);
      $.ajax({
        type: 'get',
        url: url,
        error: function(data) {
          console.log('error');
          console.log(data);
        },
        success: function(data) {
//          console.log('success');
//          console.log(data);

          // has there been a state change?
          if (dtStateCreated != data[0].created) {
            dtStateCreated = data[0].created;

            handleControllerState(Number(data[0].state));
          }
        }
      });
    }

    function setupActivityCheck() {
      setInterval(function() {
        console.log('ACTIVITY CHECK');
        getPlayers();
      }, ACTIVITY_CHECK_TIMER);
    }

    function setupController() {
      setInterval(function() {
        getControllerState();  
      }, CONTROLLER_TIMER);
    }

    function setupMap() {
      var arrMapPoint = mountainModel.get('route_points')[Math.round(mountainModel.get('route_points').length / 2)].coords;

      mountain3DView = new Mountain3DView({ el: '#piste-view', arrMapPoint: arrMapPoint, mountainType: Number(jsonCurrGame.mountainType), geography: Number(jsonCurrGame.season) });
      mountain3DView.show();
      mountain3DView.render();
    }

    function setupMapPoint(arrMapPoint) {
      mountain3DView = new Mountain3DView({ el: '#piste-view', arrMapPoint: arrMapPoint, geography: 0 });
      mountain3DView.show();
      mountain3DView.render();
    }

    function getJourneyEvents(journeyID) {
      var url = TB_API_URL + '/journeys/' + journeyID + '/events' + TB_API_EXT;
//      console.log(url);
      $.getJSON(url, function(result){
        mountainEventsCollection = new Backbone.Collection(result.body.events);
        setupMap();
      });
    }

    function getJourney(journeyID, mountain3DName) {
      var url = TB_API_URL + '/journeys/' + journeyID + TB_API_EXT;
//      console.log(url);
      $.getJSON(url, function(result){
        var jsonJourney = result.body.journeys[0];
        mountainModel = new Backbone.Model(jsonJourney);

        jsonRoute = {
          "type": "Feature",
          "properties": {
          "name": mountainModel.get('name'),
          "color": "#000000",
          },
          "geometry": {
            "type": "LineString",
            "coordinates": []
          }
        };
        // build geoJSON route
        $.each(mountainModel.get('route_points'), function(index) {
          jsonRoute.geometry.coordinates.push(this.coords);
        });
        // set distance
        mountainModel.set('distance', turf.length(jsonRoute, {units: 'kilometers'}));
        getJourneyEvents(journeyID);
      });
    }

    function getPlayers() {
      nPlayersLoaded = 0;
      playerCollection = new Backbone.Collection(jsonCurrGame.players);

      // get player activity data
      playerCollection.each(function(model){
        var player = new Player({ model: model, gameID: GAME_ID, journeyLength: mountainModel.get('distance'), journeyAscent: jsonCurrGame.ascent });

        player.getProgress(function(model){
          // default to complete
          var fProgress = mountainModel.get('distance');
          // if not complete then calc how far
          if (model.get('elevationGainPercent') < 100) {
            fProgress = (model.get('elevationGainPercent') * mountainModel.get('distance')) / 100;
          }

          model.set('progress', fProgress);
          // modify avatar to use image proxy with campaign fallback
          model.set('avatar', GAME_API_URL + 'imageproxy.php?url=' + model.get('avatar') + '&urlfallback=https://www.mountainrush.co.uk/static-assets/images/' + CAMPAIGN_TEMPLATE + '/avatar_unknown.jpg');

          nPlayersLoaded++;

          // we now have all player data!
          if (nPlayersLoaded == playerCollection.length) {
            onPlayersLoaded();
          }
        });

        player.getFundraising(function(jsonResult){
          // update fundraising
          var fRaised = Number(jsonResult.totalRaisedOnline);
          var fTarget = Number(jsonResult.fundraisingTarget);

          var elTargetAmount = $('.fundraise-sticker .target .amount');
          var fPrevTarget = Number(elTargetAmount.html());

          if (fTarget != fPrevTarget) {
            elTargetAmount.prop('number', fPrevTarget).animateNumber({ number: fTarget }, { duration: 2000 });
          }
  
          if (fRaised) {
            var elRaisedAmount = $('.fundraise-sticker .raised .amount');
            var fPrevRaised = Number(elRaisedAmount.html());

            if (fRaised != fPrevRaised) {
              elRaisedAmount.prop('number', fPrevRaised).animateNumber({ number: fRaised }, { duration: 2000 });
            }

            var fPercentRaised = (fRaised / fTarget) * 100;
            console.log(fPercentRaised);            
            $('.fundraise-sticker .percent').attr('style', 'top: ' + (100 - fPercentRaised) + '%;height: ' + fPercentRaised + '%');
          }
        });

        model.set('playerObj', player);
      });
    }

    function getGame() {
      app.dispatcher.on("ChallengeView:ready", onGameLoaded);

      challengeView = new ChallengeView({ gameID: GAME_ID });

      challengeView.load();
    }

    function onGameLoaded(jsonGame) {
      jsonCurrGame = jsonGame;

      // convert UTC dates to local
      var dLocalGameNow = new Date(jsonGame.game_now);
      var dLocalGameStart = new Date(jsonGame.game_start);
      var dLocalGameEnd = new Date(jsonGame.game_end);

      // is game active?
      if (dLocalGameStart < dLocalGameNow) {
        var elCountdownContainer = $('.countdown-container');
        var strDay = elCountdownContainer.attr('data-value-day');
        var strDays = elCountdownContainer.attr('data-value-days');

        // finished?
        if (dLocalGameEnd < dLocalGameNow) {
          elCountdownContainer.show();
        }

        $('.countdown .end').countdown(dLocalGameEnd).on('update.countdown', function(event) {
          var $this = $(this).html(event.strftime(''
            + '<span class="days">'
              + '<span class="time">%-D</span>'
              + '<span class="days-marker"> ' + ((Number(event.strftime('%-D')) == 1) ? strDay : strDays) + '</span>'
            + '</span>'
            + '<span class="hours">'
              + '<span class="time"><span>%H</span><span class="marker">:</span><span>%M</span><span class="marker">:</span><span>%S</span></span>'
            + '</span>'));
          elCountdownContainer.show();
        });
      }
      getJourney(jsonGame.journeyID, jsonGame.mountain3DName);
    }
/*
    function onPlayerLoaded(model) {
      // default to complete
      var fProgress = mountainModel.get('distance');
      // if not complete then calc how far
      if (model.get('elevationGainPercent') < 100) {
        fProgress = (model.get('elevationGainPercent') * mountainModel.get('distance')) / 100;
      }

      model.set('progress', fProgress);
      // modify avatar to use image proxy with campaign fallback
      model.set('avatar', GAME_API_URL + 'imageproxy.php?url=' + model.get('avatar') + '&urlfallback=https://www.mountainrush.co.uk/static-assets/images/' + CAMPAIGN_TEMPLATE + '/avatar_unknown.jpg');

      nPlayersLoaded++;

      console.log(nPlayersLoaded);

      // we now have all player data!
      if (nPlayersLoaded == playerCollection.length) {
        onPlayersLoaded();
      }
    }
*/
    function onPlayersLoaded() {
      // sort by progress
      playerCollection.comparator = function(model) {
        return -model.get('progress');
      }
      playerCollection.sort();

      // sub sort by when ascent completed
      playerCollection.comparator = function(model) {
        if (model.get('ascentCompleted')) {
          return Date.parse(model.get('ascentCompleted'));
        }
      }
      playerCollection.sort();

      // fill in extra player data
      var nPos = 1;
      playerCollection.each(function(model){
        model.set('imagePath', model.get('avatar'));
        model.set('step', nPos);

        nPos++;
      });

      addPlayers();
    }

    function buildGame() {
      var strCampaignFolder = '';

      // modify images to use image proxy
      var strImageHost = GAME_API_URL + 'imageproxy.php?url=';

      mountain3DView.addRouteData(mountainModel.get('route_points'));

      mountain3DView.addFlag(strImageHost + 'https://www.mountainrush.co.uk/static-assets/images/' + strCampaignFolder + 'markers/marker-location.png', true);
      mountain3DView.showBaseData();

      setupController();
      setupActivityCheck();

      // ready for action
      $('body').addClass('ready');
    }

    function addPlayers() {
      mountain3DView.addPlayers(playerCollection, false);

      nCurrPlayer = 0;
      currPlayerModel = playerCollection.at(nCurrPlayer);

      // mla
      console.log('p:'+fCurrProgress+' : '+currPlayerModel.get('progress'));

      // do we have progress?
      if (currPlayerModel.get('progress') > fCurrProgress) {
        console.log('NEW PROGRESS');
        fCurrProgress = currPlayerModel.get('progress');
        mountain3DView.selectPlayer(currPlayerModel.get('playerObj').model.get('id'));
      }
    }

    function onLocationLoaded() {
      buildGame();
      getPlayers();
    }

    function onFeatureClicked(id) {
      switch (id) {
        case FLAG_ID:
          mountain3DView.playRoute();
          break;

        default:
          mountain3DView.selectFeature(id);
          break;
      }
    }

    getGame();

    $(window).resize(function() {
      handleResize(true);
    });
    handleResize(true);
  };

  return { 
    initialize: initialize
  };
});

