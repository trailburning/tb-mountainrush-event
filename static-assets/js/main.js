require.config({
  waitSeconds: 10,
  paths: {
    jquery: 'libs/jquery-2.1.4.min',
    Modernizr: 'libs/modernizr-custom',
    underscore: 'libs/underscore-min',
    backbone: 'libs/backbone-min',
    bootstrap: 'https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min',
    moment: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min',
    photoswipe: 'https://cdnjs.cloudflare.com/ajax/libs/photoswipe/4.1.2/photoswipe.min',
    photoswipeui: 'libs/photoswipe-ui-default-with-ig.min',
    countdown: 'libs/jquery.countdown.min',
    turf: 'https://npmcdn.com/@turf/turf/turf.min',
    piste: 'https://planet.procedural.eu/procedural-js/0.3.2/procedural',
    detector: 'https://planet.procedural.eu/procedural.detector'
  },
  shim: {
    'bootstrap' : {
      deps: ['jquery']
    },
    'countdown' : {
      deps: ['jquery']
    }
  }
});

// Load our app module and pass it to our definition function
require(['controller/' + APP], function(App){
  App.initialize();
})
