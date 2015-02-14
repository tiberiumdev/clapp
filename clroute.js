clApp.config(function ($routeProvider) {

    $routeProvider
    .when('/', {
        templateUrl : 'views/main.html'
    })
    .when('/coldcomputer', {
        templateUrl : 'views/checklist.html'
    })
    .when('/closeout', {
        templateUrl : 'views/checklist.html'
    })
    .when('/finished', {
        templateUrl : 'views/finished.html'
    })
    .when('/checklist', {
        templateUrl : 'views/checklist.html'
    })
    ;
});
