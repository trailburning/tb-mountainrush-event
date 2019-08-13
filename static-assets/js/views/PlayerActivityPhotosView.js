define([
  'underscore', 
  'backbone',
  'views/PlayerActivityPhotoView'
], function(_, Backbone, PlayerActivityPhotoView){

  var PlayerActivityPhotosView = Backbone.View.extend({
    initialize: function(options){
      this.options = options;

      this.jsonPhotos = null;
    },

    getPlayer: function() {
      return this.options.player;
    },

    load: function(){
      var self = this;

      var url = GAME_API_URL + "game/" + self.options.gameID + "/player/" + self.options.playerID + "/activity/" + self.options.activityID + "/photos";
//      console.log(url);
      $.getJSON(url, function(result){
        self.activityID = self.options.activityID;
        self.jsonPhotos = result;

        // fire event
        app.dispatcher.trigger("PlayerActivityPhotosView:loaded", self);
      });
    },

    render: function(callback, nMaxPhotos){
      var self = this;
      var nPhotos = this.jsonPhotos.length;
      if (nMaxPhotos) {
        nPhotos = nMaxPhotos;
      }

      $.each(this.jsonPhotos, function(index, photo){
        if (index < nPhotos) {        
          var photoView = new PlayerActivityPhotoView({ elParent: self.el, model: new Backbone.Model(photo), player: self.options.player });
          photoView.render();

          // callback
          callback(self, photoView);
        }
      });

      // truncate
      $('.truncate', $(this.el)).each(function(index){
        $(this).html($.truncate($(this).html(), {length: $(this).attr('data-truncate')}));
      });

      return this;
    }

  });

  return PlayerActivityPhotosView;
});
