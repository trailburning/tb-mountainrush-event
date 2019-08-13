var app = app || {};

var CONTROLLER_API_URL  = 'server/';

var STATE_FLY = 1;
var STATE_SPIN = 2;
var STATE_TOGGLE_SNOW = 3;
var STATE_GOTO_START = 4;
var STATE_GOTO_SUMMIT = 5;
var STATE_FOCUS_PLAYER = 6;
var STATE_MOVE_PLAYER = 7;

define([
  'underscore',
  'backbone'
], function(_, Backbone){
  app.dispatcher = _.clone(Backbone.Events);

  _.templateSettings = {
      evaluate:    /\{\{(.+?)\}\}/g,
      interpolate: /\{\{=(.+?)\}\}/g,
      escape:      /\{\{-(.+?)\}\}/g
  };

  var initialize = function() {
    var self = this;

    function changeState(nState) {
      var jsonData = {state: nState};

      var url = CONTROLLER_API_URL + "controlstate";
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
    }

    $('.fly').click(function(evt){
      changeState(STATE_FLY);
    });

    $('.spin').click(function(evt){
      changeState(STATE_SPIN);
    });

    $('.addsnow').click(function(evt){
      changeState(STATE_TOGGLE_SNOW);
    });

    $('.start').click(function(evt){
      changeState(STATE_GOTO_START);
    });

    $('.summit').click(function(evt){
      changeState(STATE_GOTO_SUMMIT);
    });

    $('.focusplayer').click(function(evt){
      changeState(STATE_FOCUS_PLAYER);
    });

    $('.moveplayer').click(function(evt){
      changeState(STATE_MOVE_PLAYER);
    });
  };

  return { 
    initialize: initialize
  };
});

