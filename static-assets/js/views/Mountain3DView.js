var SEASON_SUMMER_EUROPE  = 0;
var SEASON_WINTER_EUROPE  = 1;
var SEASON_SUMMER_EQUATOR  = 2;

var ROUTE_ID = 3000;
var FLAG_ID = 4000;

var STATE_INIT = 0;
var STATE_READY = 1;
var STATE_SELECT_PLAYER = 2;
var STATE_SELECT_PLAYER_NO_SELECT = 3;
var STATE_SELECT_PLAYER_AND_ORBIT = 4;

var MOUNTAIN_TYPE_GULLYS = 0;
var MOUNTAIN_TYPE_SMOOTH = 1;

var MARKER_FADE_DISTANCE = 20000;

define([
  'underscore', 
  'backbone',
  'turf',
  'detector',
  'piste'
], function(_, Backbone, turf, detector, piste){

  var Mountain3DView = Backbone.View.extend({
    initialize: function(options){
      this.options = options;

      this.nState = STATE_INIT;
      this.timeoutID = null;
      this.playerCollection = null;
      this.arrMarkers = new Array;
      this.jsonRoute = null;
      this.jsonFlag = null;
      this.bFlagVisible = false;
      this.currPlayerID = null;
      this.arrRouteCoords = null;
    },

    hide: function(){
      $(this.el).hide();
    },

    show: function(){
      $(this.el).show();
    },

    changeState: function(){
      var self = this;

      switch (this.nState) {
        case STATE_INIT:
          this.nState = STATE_READY;

          // fire event
          app.dispatcher.trigger("Mountain3DView:onFeaturesLoaded");
          break;

        case STATE_SELECT_PLAYER:
          this.nState = STATE_READY;

//          var coords = this.playerCollection.get(this.currPlayerID).get('jsonPlayer').features[0].geometry.coordinates;
//          Procedural.focusOnLocation( {latitude: coords[1], longitude: coords[0], distance: 5000, angle: 5} );
          break;

        case STATE_SELECT_PLAYER_NO_SELECT:
          break;

        case STATE_SELECT_PLAYER_AND_ORBIT:
          var coords = this.playerCollection.get(this.currPlayerID).get('jsonPlayer').features[0].geometry.coordinates;
          Procedural.focusOnLocation( {latitude: coords[1], longitude: coords[0], distance: 2000, angle: 20, animationDuration: 3} );
          break;

        default:
          break;
      }
    },

    showBaseData: function(){
      var jsonMapRoute = {
        "name": "Route",
        "type": "FeatureCollection",
        "features": [
        {
          "id": ROUTE_ID,
          "type": "Feature",
          "properties": {
            "selectable": false,
            "name": "",
            "color": "#f75f36",
            "thickness": 3
          },
          "geometry": {
            "type": "LineString",
            "coordinates": []
          }
        }
        ]
      };

      $.each(this.arrRouteCoords, function(index) {
        jsonMapRoute.features[0].geometry.coordinates.push(this.coords);
      });

      Procedural.addOverlay( jsonMapRoute );
      this.showFlag();
    },

    addRouteData: function(arrRouteCoords){
      this.arrRouteCoords = arrRouteCoords;

      this.jsonRoute = {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": []
        }
      };

      var self = this;
      $.each(arrRouteCoords, function(index) {
        self.jsonRoute.geometry.coordinates.push(this.coords);
      });
    },

    selectPlayer: function(id, bOrbitPlayer){      
      var player = null;

      if (this.timeoutID) {
        window.clearTimeout(this.timeoutID);
      }

      this.nState = STATE_SELECT_PLAYER;

      if (bOrbitPlayer) {
        this.nState = STATE_SELECT_PLAYER_AND_ORBIT;
        this.hideFlag();
      }
      else {
        this.showFlag();
      }

      // remove current player
      if (this.currPlayerID) {
        player = this.playerCollection.get(this.currPlayerID);
        Procedural.removeOverlay( String(player.get('jsonPlayer').features[0].id) );
      }

      this.currPlayerID = id;

      this.showPlayer(this.currPlayerID);

      var coords = this.playerCollection.get(this.currPlayerID).get('jsonPlayer').features[0].geometry.coordinates;
      Procedural.focusOnLocation( {latitude: coords[1], longitude: coords[0], distance: 5000, angle: 5} );
    },

    selectPlayerNoSelect: function(id){
      var player = null;

      if (this.timeoutID) {
        window.clearTimeout(this.timeoutID);
      }

      this.nState = STATE_SELECT_PLAYER_NO_SELECT;

      this.showFlag();

      // remove current player
      if (this.currPlayerID) {
        player = this.playerCollection.get(this.currPlayerID);
        Procedural.removeOverlay( String(player.get('jsonPlayer').features[0].id) );
      }

      this.currPlayerID = id;

      this.showPlayer(this.currPlayerID);
    },

    showPlayer: function(id){
      var player = this.playerCollection.get(id);
      Procedural.addOverlay( player.get('jsonPlayer') );
    },

    hidePlayer: function(id){
      var player = this.playerCollection.get( id );
      Procedural.removeOverlay( String(player.get('jsonPlayer').features[0].id) );
    },

    addPlayers: function(playerCollection, activePlayer){
      this.activePlayer = activePlayer;
      var self = this;
      var jsonPlayer = null;
      var bMultiPlayer = false;

      if (playerCollection.length > 1) {
        bMultiPlayer = true;
      }

      this.playerCollection = playerCollection;

      this.playerCollection.each(function(model, index){
        var bAllowPlayerSelect = true;
        jsonPlayer = self.buildPlayerJSON(model.get('id'), model.get('progress'), model.get('imagePath'), index+1, bMultiPlayer, bAllowPlayerSelect, MARKER_FADE_DISTANCE);

        model.set('jsonPlayer', jsonPlayer);
      });      
    },

    buildPlayerJSON: function(id, fProgressKM, strAvatar, nPosLabel, bShowPosLabel, bAllowPlayerSelect, nFadeDistance){
      var along = turf.along(this.jsonRoute, fProgressKM, {units: 'kilometers'});
      var fLat = along.geometry.coordinates[1];
      var fLong = along.geometry.coordinates[0];
      var bPlayerOverlapsMarker = false;

      // see if the active player overlaps a marker
      var nOverlapYAdjust = 0, nOverlapCaretYAdjust = 0, nOverlapPosYAdjust = 0, nDecimalPlaces = 3;
      if (this.activePlayer) {
        if (id == this.activePlayer.get('id')) {
          $.each(this.arrMarkers, function(index, jsonMarker){
            if (fLat == jsonMarker.features[0].geometry.coordinates[1] && (fLong = jsonMarker.features[0].geometry.coordinates[0])) {
              bPlayerOverlapsMarker = true;
            }
          });
        }
      }

      if (bPlayerOverlapsMarker) {
        nOverlapYAdjust = 3;
        nOverlapCaretYAdjust = 16.9;
        nOverlapPosYAdjust = 8.4;        
      }

      var fIconY = 2;
      var fCaretY = 5.55;
      
      var jsonPlayer = {
        "name": id,
        "features": [ 
          {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": id,
            "properties": {
              "selectable": bAllowPlayerSelect,
              "fadeDistance": nFadeDistance,
              "borderRadius": 32,
              "image": strAvatar,
              "height": 64,
              "width": 64,
              "borderWidth": 2,
              "background": "#ccc",
              "anchor": {
                "y": nOverlapYAdjust + fIconY,
                "x": 0
              }
            }
          },
          {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": id,
            "properties": {
              "fadeDistance": nFadeDistance,
              "fontSize": 12,
              "anchor": {
                "y": nOverlapCaretYAdjust + fCaretY,
                "x": 0
              },
              "icon": "caret-down"
            }
          },
          {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": id,
            "properties": {
              "selectable": false,
              "fadeDistance": nFadeDistance,
              "name": String(nPosLabel),
              "borderRadius": 23,
              "padding": 5,
              "fontSize": 13,
              "anchor": {
                "y": nOverlapPosYAdjust + 1.4,
                "x": 0
              },
              "background": "#44b6f7"
            }
          }
        ]
      }

      if (!bShowPosLabel) {
        fIconY = 1.05;
        fCaretY = 0.2;

        jsonPlayer = {
          "name": id,
          "features": [ 
            {
              "geometry": {
                "type": "Point",
                "coordinates": [ fLong, fLat ]
              },
              "type": "Feature",
              "id": id,
              "properties": {
                "selectable": bAllowPlayerSelect,
                "fadeDistance": nFadeDistance,
                "borderRadius": 32,
                "image": strAvatar,
                "height": 64,
                "width": 64,
                "borderWidth": 2,
                "background": "#ccc",
                "anchor": {
                  "y": nOverlapYAdjust + fIconY,
                  "x": 0
                }
              }
            },
            {
              "geometry": {
                "type": "Point",
                "coordinates": [ fLong, fLat ]
              },
              "type": "Feature",
              "id": id,
              "properties": {
                "fadeDistance": nFadeDistance,
                "fontSize": 12,
                "anchor": {
                  "y": nOverlapCaretYAdjust + fCaretY,
                  "x": 0
                },
                "icon": "caret-down"
              }
            }
          ]
        }
      }

      return jsonPlayer;
    },

    selectMarker: function(nID){
      Procedural.focusOnFeature(MARKER_BASE_ID + nID);
    },

    hideMarkers: function(){
      $.each(this.arrMarkers, function(index, jsonMarker){
        Procedural.removeOverlay(jsonMarker.name);
      });
    },

    showMarkers: function(){
      $.each(this.arrMarkers, function(index, jsonMarker){
        Procedural.addOverlay(jsonMarker);
      });

      // fire event
//      app.dispatcher.trigger("Mountain3DView:onMarkersReady");
    },

    buildMarkerOff: function(id, fLat, fLong, strMarkerImageOff, nFadeDistance){
      var jsonMarker = {
        "name": id,
        "features": [ 
          {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": id,
            "properties": {
              "selectable": false,
              "fadeDistance": nFadeDistance,
              "borderRadius": 12,
              "image": strMarkerImageOff,
              "height": 24,
              "width": 24,
              "borderWidth": 2,
              "anchor": {
                "y": 1.2,
                "x": 0
              }
            }
          }
        ]
      }
      return jsonMarker;
    },

    buildMarkerOn: function(id, fLat, fLong, strMarkerImage, strMarkerImageOn, nFadeDistance){
      var fMarkerY = 1.2, nCaretYPos = 6.4;

      var jsonMarker = {
        "name": id,
        "features": [ 
          {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": id,
            "properties": {
              "selectable": true,
              "fadeDistance": nFadeDistance,
              "borderRadius": 27,
              "image": strMarkerImage,
              "height": 48,
              "width": 48,
              "borderWidth": 2,
              "anchor": {
                "y": 2.5,
                "x": 0
              }
            }
          },
          {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": id,
            "properties": {
              "fadeDistance": nFadeDistance,
              "fontSize": 12,
              "anchor": {
                "y": nCaretYPos,
                "x": 0
              },
              "icon": "caret-down"
            }
          },
          {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": id,
            "properties": {
              "selectable": true,
              "fadeDistance": nFadeDistance,
              "borderRadius": 32,
              "image": strMarkerImageOn,
              "height": 24,
              "width": 24,
              "borderWidth": 2,
              "anchor": {
                "y": fMarkerY,
                "x": 0
              }
            }
          }
        ]
      }

      return jsonMarker;
    },

    addMarker: function(id, coord, fProgressKM, strMarkerImage, strMarkerImageOn, strMarkerImageOff){
      var pt = {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Point",
          "coordinates": []
        }
      }

      // look for point on line
      pt.geometry.coordinates[1] = coord[0];
      pt.geometry.coordinates[0] = coord[1];

      var snapped = turf.pointOnLine(this.jsonRoute, pt);

      fLat = snapped.geometry.coordinates[1];
      fLong = snapped.geometry.coordinates[0];

      // slice route at point
      var ptStart = turf.point([this.jsonRoute.geometry.coordinates[0][0], this.jsonRoute.geometry.coordinates[0][1]]);
      var ptMarker = turf.point([fLong, fLat]);
      var sliced = turf.lineSlice(ptStart, ptMarker, this.jsonRoute.geometry);

      var fMarkerKM = turf.length(sliced, {units: 'kilometers'});
      var bEnable = false;

      if (Number(fProgressKM) >= Number(fMarkerKM)) {
        bEnable = true;
      }

      if (bEnable) {
        jsonMarker = this.buildMarkerOn(id, fLat, fLong, strMarkerImage, strMarkerImageOn, MARKER_FADE_DISTANCE);
      }
      else {
        jsonMarker = this.buildMarkerOff(id, fLat, fLong, strMarkerImageOff, MARKER_FADE_DISTANCE);
      }
      this.arrMarkers.push(jsonMarker);

      return bEnable;
    },

    showFlag: function() {
      if (!this.bFlagVisible) {
        this.bFlagVisible = true;

        Procedural.addOverlay( this.jsonFlag );
      }
    },

    hideFlag: function() {
      if (this.bFlagVisible) {
        this.bFlagVisible = false;

        Procedural.removeOverlay( this.jsonFlag.features[0].id );
      }
    },

    addFlag: function(strImage, bRender) {      
      var fLat = this.jsonRoute.geometry.coordinates[this.jsonRoute.geometry.coordinates.length-1][1];
      var fLong = this.jsonRoute.geometry.coordinates[this.jsonRoute.geometry.coordinates.length-1][0];

      var jsonFlag = {
        "name": FLAG_ID,
        "features": [ {
            "geometry": {
              "type": "Point",
              "coordinates": [ fLong, fLat ]
            },
            "type": "Feature",
            "id": FLAG_ID,
            "properties": {
              "selectable": true,
              "image": strImage,
              "height": 39,
              "width": 32,
              "anchor": {
                "y": 1.2,
                "x": 0
              }
            }
          }
        ]
      }

      if (!bRender) {
        jsonFlag = {
          "name": FLAG_ID,
          "features": [ {
              "geometry": {
                "type": "Point",
                "coordinates": [ fLong, fLat ]
              },
              "type": "Feature",
              "id": FLAG_ID,
              "properties": {
                "selectable": false
              }
            }
          ]
        }
      }

      this.jsonFlag = jsonFlag;
    },

    selectPoint: function(nPoint){
      var coords = this.arrRouteCoords[0].coords;
      Procedural.focusOnLocation( {latitude: coords[1], longitude: coords[0], distance: 3000} );
    },

    selectFlag: function(){
      var coords = this.jsonFlag.features[0].geometry.coordinates;
      Procedural.focusOnLocation( {latitude: coords[1], longitude: coords[0], distance: 2000, angle: 10} );
    },

    selectFeature: function(id){
      Procedural.focusOnFeature(id);
    },

    spin: function(){
      Procedural.orbitTarget();
    },

    focusLocation: function(fLat, fLong){
      Procedural.focusOnLocation( {latitude: fLat, longitude: fLong, distance: 2000, angle: 10} );
    },

    focusLocationWithOptions: function(fLat, fLong, fDistance, fAngle){
      Procedural.focusOnLocation( {latitude: fLat, longitude: fLong, distance: fDistance, angle: fAngle} );
    },

    playRoute: function(){
      Procedural.animateAlongFeature( ROUTE_ID, { distance: 1000, speed: 500 } );
    },

    campaignAttractor: function(){
      Procedural.animateAlongFeature( ROUTE_ID, { distance: 2500, speed: 200 } );
    },

    attractor: function(){
      Procedural.orbitTarget();
    },

    setSeason: function(nSeason){
      switch (nSeason) {
        case SEASON_SUMMER_EUROPE:
          var geo = {
            title: 'summer',
            parameters: {
              snowTop: 2800,
              snowBottom: 2700,
              snowInclination: 0.25
            }
          };
          Procedural.setGeography( geo );
          break;

        case SEASON_WINTER_EUROPE:
          var geo = {
            title: 'winter',
            parameters: {
              snowTop: 2800,
              snowBottom: 1000,
              snowInclination: 1
            }
          };
          Procedural.setGeography( geo );
          break;

        case SEASON_SUMMER_EQUATOR:
          Procedural.setGeography( {
            "parameters" : {
              "snowTop" : 5000,
              "snowBottom" : 4999,
              "rockTop": 5000,
              "rockBottom": 4999,
              "treeColor": "#49850a",
              "grassColor": "#94ab47"
            }
          } );
          break;
      }
    },

    render: function(){
      var self = this;

      var build = function () {
        // render season
        self.setSeason(self.options.geography);

        Procedural.displayLocation( { latitude: self.options.arrMapPoint[1], longitude: self.options.arrMapPoint[0] } );
        Procedural.onLocationLoaded = function () {
          var container = self.el;
          Procedural.init( container );

          // fire event
          app.dispatcher.trigger("Mountain3DView:onLocationLoaded");
        };

        Procedural.onFeaturesLoaded = function () {
          self.changeState();
        }

        Procedural.onFeatureClicked = function ( id ) {
          // fire event
          app.dispatcher.trigger("Mountain3DView:onFeatureClicked", id);
        }

        Procedural.onLocationFocused = function () {
          if (self.nState == STATE_SELECT_PLAYER_AND_ORBIT) {
            // take a spin around!
            self.nState = STATE_READY;
            Procedural.orbitTarget();
          }
        }
      }

      var init = function () {
        if (Procedural.deviceCapable) {
          build();
        }
        else {
          // fire event
          app.dispatcher.trigger("Mountain3DView:deviceNotCapable");          
        }
      };

      // When engine is ready initialize
      if ( Procedural.ready ) {
        init();
      } else {
        Procedural.onReady = init;
      }

      return this;
    }

  });

  return Mountain3DView;
});
