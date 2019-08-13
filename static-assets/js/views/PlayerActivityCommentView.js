define([
  'underscore', 
  'backbone'
], function(_, Backbone){

  var PlayerActivityCommentView = Backbone.View.extend({
    initialize: function(options){
      this.template = _.template($('#commentViewTemplate').text());

      this.options = options;
    },

    render: function(jsonComments){
      var self = this;

      $(this.el).html(this.template({comments: jsonComments}));

      return this;
    }

  });

  return PlayerActivityCommentView;
});
