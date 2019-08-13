define([
  'underscore', 
  'backbone',
  'bootstrap'
], function(_, Backbone, bootstrap){

  var FundraisingDonationSummaryView = Backbone.View.extend({
    initialize: function(options){
      this.template = _.template($('#fundraisingDonationSummayViewTemplate').text());

      this.options = options;
      this.jsonFields = {totalRaisedPercentageOfFundraisingTarget: 0,
                        currencySymbol: '£',
                        totalRaisedOnline: 0,
                        fundraisingTarget: 0,
                        fundraising_pageID: null,
                        playerID: 0
                        }
    },

    render: function(jsonFields){
      var self = this;
      
      if (jsonFields) {
        this.jsonFields = jsonFields;
      }

      if (TEST_PROGRESS) {
        if (TEST_PROGRESS == 100) {
          this.jsonFields.totalRaisedOnline = this.jsonFields.fundraisingTarget;
        }
      }

      $(this.el).html(this.template({page: this.jsonFields}));

      return this;
    }

  });

  return FundraisingDonationSummaryView;
});
