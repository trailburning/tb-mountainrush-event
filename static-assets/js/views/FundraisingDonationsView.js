define([
  'underscore', 
  'backbone',
  'bootstrap'
], function(_, Backbone, bootstrap){

  var FundraisingDonationsView = Backbone.View.extend({
    initialize: function(options){
      this.template = _.template($('#fundraisingDonationsViewTemplate').text());

      this.options = options;
    },

    render: function(jsonData){
      var self = this;
      
      $(this.el).html(this.template({donations: jsonData}));

      return this;
    }

  });

  return FundraisingDonationsView;
});
