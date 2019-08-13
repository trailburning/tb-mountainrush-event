define([
  'underscore', 
  'backbone'
], function(_, Backbone){

  var PlayerActivityMorePhotosView = Backbone.View.extend({
    initialize: function(options){
      this.template = _.template($('#morePhotosViewTemplate').text());
      
      this.options = options;
      this.bRendered = false;
    },

    hide: function(){
      this.el.hide();
    },

    render: function(){
      if (this.bRendered) {
        return this;
      }
      this.bRendered = true;

      var self = this;

      this.el = $(this.template()).appendTo(this.options.elParent);

      $('.more-btn', this.el).click(function(evt){
        // fire event
        app.dispatcher.trigger("PlayerActivityMorePhotosView:click", {playerID: self.options.playerID, PlayerActivityMorePhotosView: self});
      });

      return this;
    }

  });

  return PlayerActivityMorePhotosView;
});
