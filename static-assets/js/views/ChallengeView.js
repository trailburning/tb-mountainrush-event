define([
  'underscore', 
  'backbone',
  'turf'
], function(_, Backbone, turf){

  var ChallengeView = Backbone.View.extend({
    initialize: function(options){
      this.options = options;
    },

    create: function(){
      var self = this;

      var jsonData = {name: 'Mitterhorn', 
                      ascent: 0, 
                      type: 'Run', 
                      gameStart: '2017-01-01', 
                      gameEnd: '2017-01-01', 
                      journeyID: '5875843c37d99829635908', 
                      mountain3DName: 'mitterhorn'};

      var url = GAME_API_URL + "game";
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

    load: function(){
      var self = this;

      var url = GAME_API_URL + "game/" + self.options.gameID;
//      console.log(url);
      $.getJSON(url, function(result){
        self.jsonGame = result[0]; 

        var url = GAME_API_URL + 'campaign/' + CAMPAIGN_ID + '/fundraising/causes';
//        console.log(url);
        $.getJSON(url, function(result){
          self.jsonGame.jsonFundraising = result;

          // fire event
          app.dispatcher.trigger("ChallengeView:ready", self.jsonGame);          
        });
      });
    }

  });

  return ChallengeView;
});
