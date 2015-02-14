/**
 * @namespace CheckListApp
 * @class CheckListApp.clapp
 * @memberOf CheckListApp
 * @author Jeff Thomas <dev at tiberiumsoftware.com>
 * @copyright 2015 Tiberium Software LLC.  All rights reserved
 */
var clApp = angular.module('clApp', ['ngRoute', 'ngResource'])
    /**
     * @class config
     * @description Standard config used to set debug logging level
     * @memberOf CheckListApp.clapp
     * @param {Provider} $logProvider  The logprovider so we can configure debug state
     */
    .config(['$logProvider', function ($logProvider) {
        $logProvider.debugEnabled(false);
    }])

    /**
     * @class CheckListService
     * @description Factory used to go get checklist json files
     * @memberOf CheckListApp.clapp
     * @param   {ResourceProvider} $resource Angular Resource Provider
     * @returns {Resource}   The constructed Resource
     */
    .factory('CheckListService', function ($resource) {
        return {
            /**
             * @function getResource
             * @description Since we want to pass a parameter to construct the JSON url,
             * we create a simple method to do it
             * @memberOf CheckListApp.clapp.CheckListService
             * @param   {string} checkToGet The name of the checklist to get. <b>MUST MATCH</b>
             * @returns {Resource} A resource to use to call for the data
             */
            getResource: function (checkToGet) {
                return $resource('data/' + checkToGet + '.json');
            }
        }
    })

    /**
     * @class millisToTime
     * @description Filter to filter the duration from millis to hh:mm:ss
     * @memberOf CheckListApp.clapp
     * @returns {string} The millisecond count to convert
     */
    .filter('millisToTime', function() {
        return function(milliseconds) {
            var millis = milliseconds % 1000;
            var seconds = parseInt((milliseconds/1000)%60);
            var minutes = parseInt((milliseconds/(1000*60))%60);
            var hours = parseInt((milliseconds/(1000*60*60))%24);
            var out = "";

            minutes = (parseInt(minutes) + (60 * parseInt(hours)));
            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;
            hours = (hours < 10) ? "0" + hours : hours;
            out = hours + ":" + minutes + ":" + seconds + ':' + millis;

            return out;
        };
    })

    /**
     * @class CheckListApp.clapp.CLController
     * @memberOf CheckListApp.clapp
     * @description The main controller -- this is a ingle controller app
     * @param {Object} $scope           controller scope
     * @param {Object} $http            default http provider
     * @param {Object} $location        location provider for hopping through subchecklists
     * @param {Object} $log             the logger
     * @param {Object} CheckListService See: [CheckListService]{@link CheckListApp.clapp.CheckListService}
     */
    .controller('CLController', function ($scope, $http, $location, $log, CheckListService) {
        $log.debug($location.path());
        $scope.isAircraftList = false;
        $scope.loadColdAndCheckout = false;
        $scope.timings=[];
        $scope.masterStepCount=0;
        $scope.totalDuration=0;

        if ($location.path() != '/') {
            //TODO: need to solve the refresh page issue:  for now we just redirect to the root page
            $location.path('/');
            //        if ($scope.checkList===null || angular.isUndefined($scope.checkList)) {
            //            if (!$scope.isAircraftList) {
            //                loadCheckListPage($location.path());
            //            } else {
            //                loadAircraftCheckListPage($location.path());
            //            }
            //        }
        }

        $scope.mainForm = {};
        $scope.checkListSteps = {};

        $scope.aircraftOptions = [
            {
                value: "a319",
                name: "Airbus 319"
            },
            {
                value: "b737",
                name: "Boeing 737"
            }
//            {
//                value: "e145",
//                name: "ERJ 145"
//            }
        ];


        /**
         * @event checklistItemChecked
         * @memberOf CheckListApp.clapp.CLController
         * @description Called each time an item is checked.
         * @param {integer} itemIndex This is the item index so we can turn on the checkbox and do the check for all items selected
         */
        $scope.checklistItemChecked = function (itemIndex) {
            var blue='rgb(0, 0, 255) none repeat scroll 0% 0% / auto padding-box border-box';

            if(!$('#checkListBox' + itemIndex).prop("checked")) {
                $('#checkListBox' + itemIndex).prop("checked", !$('#checkListBox' + itemIndex).prop("checked"));
            } else if($('#checkListBox' + itemIndex).prop("checked")) {
                if ($('#lblCheck'+itemIndex).css('background')==blue) {
                    $('#checkListBox' + itemIndex).prop("checked", !$('#checkListBox' + itemIndex).prop("checked"));
                    $('#lblCheck' + itemIndex).css('background','');
                    $('#checkTitle'+itemIndex).css('color','');
                    $('#checkStatus'+itemIndex).css('color','');
                    $('#lblCheck' + itemIndex).html('&nbsp;');
                } else {
                    $('#lblCheck' + itemIndex).css('background',blue);
                    $('#lblCheck' + itemIndex).text('-');
                    $('#checkTitle'+itemIndex).css('color','blue');
                    $('#checkStatus'+itemIndex).css('color','blue');
                }
            }

            var checkedCount = $("input[name^='checkListBox']:checked").length;
            $log.debug(checkedCount);

            //turn back on for production
            if (checkedCount === $scope.currentCheckListStepCount) {
                $('#btnNext').removeClass('checkListNextDisabled disabled');
                $('#btnNext').addClass('checkListNext');
            } else {
                $('#btnNext').addClass('checkListNextDisabled disabled');
                $('#btnNext').removeClass('checkListNext');
            }

//            $('#btnNext').removeClass('checkListNextDisabled disabled');
//            $('#btnNext').addClass('checkListNext');
        }

        /**
         * @event checkListSelection
         * @memberOf CheckListApp.clapp.CLController
         * @description Called on submit of the first form
         * @param {Object} frm The form data itself
         */
        $scope.checkListSelection = function (frm) {

            $scope.selectedAircraft = frm.selectedAircraft.name;
            $scope.mainForm = frm;
            if (frm.loadColdComputer) {
                $scope.loadColdAndCheckout=true;
                loadCheckListPage('coldcomputer');
            } else {
                $scope.isAircraftList = true;
                loadAircraftCheckListPage(frm.selectedAircraft.value);
            }
        }

        /**
         * @event loadNextPage
         * @memberOf CheckListApp.clapp.CLController
         * @description Responds to the Go/Next button and loads the next checklist accordingly
         */
        $scope.loadNextPage = function () {
            logTime('stop',$scope.currentPage);

            if ($scope.aircraftCheckList) {
                loadNextAircraftChecklist();
            } else {
                loadAircraftCheckListPage($scope.mainForm.selectedAircraft.value);
            }
        }

        /**
         * @method loadNextAircraftChecklist
         * @memberOf CheckListApp.clapp.CLController
         * @description Updates the aircraft checklist and loads the next one in the aircraft checklist
         * list.  If there are no more loaded, launches the close out checklist if chosen.
         */
        function loadNextAircraftChecklist() {
            $scope.currentAircraftCheckListIndex++;
            var cnt = $scope.currentAircraftCheckListIndex;

            if ($scope.currentPage == 'closeout') {
                $location.path('finished');
            } else if (cnt>$scope.aircraftCheckList.checklists.length-1) {
                if ($scope.loadColdAndCheckout) {
                    $scope.currentPage='closeout';
                    loadCheckListPage($scope.currentPage);
                } else {
                    $location.path('finished');
                }
            } else {
                $scope.checkList = $scope.aircraftCheckList.checklists[$scope.currentAircraftCheckListIndex];
                $scope.currentPage=$scope.checkList.name;
                logTime('start', $scope.currentPage);
                configureCheckList();
                $location.path('checklist');
            }

        }

        /**
         * @method configureCheckList
         * @memberOf CheckListApp.clapp.CLController
         * @description Resets the checklist counter and hides the next button.
         * Then makes a call to load the next checklist
         */
        function configureCheckList() {
            $log.debug($scope.checkList);
            $scope.currentCheckListStepCount = $scope.checkList.steps.length;
            $log.debug('Number of steps: ' + $scope.currentCheckListStepCount);
            $('#btnNext').addClass('checkListNextDisabled disabled');
            $('#btnNext').removeClass('checkListNext');
        }

        /**
         * @method loadCheckListPage
         * @memberOf CheckListApp.clapp.CLController
         * @description Loads a non-aircraft checklist (cold computer or close out)
         * @param {string} checkListPage The name of the checklist to call <b>MUST MATCH THE json FILE NAME</b>
         */
        function loadCheckListPage(checkListPage) {
            $scope.checkList = CheckListService.getResource(checkListPage).get(function () {
//                $log.debug($scope.checkList);
//                $scope.currentCheckListStepCount = $scope.checkList.steps.length;
//                $log.debug('Number of steps: ' + $scope.currentCheckListStepCount);
                configureCheckList();
                logTime('start',checkListPage);
                $scope.currentPage=checkListPage;
                $location.path(checkListPage);
            });
        }

        /**
         * @method loadAircraftCheckListPage
         * @memberOf CheckListApp.clapp.CLController
         * @description Loads a aircraft checklist by the given name
         * @param {string} checkListPage The name of the checklist to call <b>MUST MATCH THE json FILE NAME</b>
         */
        function loadAircraftCheckListPage(checkListPage) {
            $scope.aircraftCheckList = CheckListService.getResource(checkListPage).get(function () {
                $scope.currentAircraftCheckListIndex = 0;
                $scope.checkList = $scope.aircraftCheckList.checklists[$scope.currentAircraftCheckListIndex];
                configureCheckList();
                logTime('start',checkListPage);
                $scope.currentPage=checkListPage;
                $location.path('checklist');
            });
        }

        /**
         * @method logTime
         * @memberOf CheckListApp.clapp.CLController
         * @description logs the time into the loggings for the FLight Summary Report
         * @param {string} startStop start or stop
         * @param {string} list      the list name to add a timing for
         */
        function logTime(startStop,list) {
            if (startStop==='start') {
                $scope.timings.push({
                    "list" : list.toUpperCase(),
                    "start" : $.now(),
                    "stop": "",
                    "duration" : ""
                });
            } else {
                var lastIndex = $scope.timings.length-1;

                $scope.timings[lastIndex].stop=$.now();
                var stop = parseInt($scope.timings[lastIndex].stop);
                var start = parseInt($scope.timings[lastIndex].start);
                $scope.timings[lastIndex].duration=stop - start;
                $scope.totalDuration +=stop - start;
            }
        }

    })

    /**
     * @class clappDisclaimer
     * @description This is a directive for printing
     * @memberOf CheckListApp.clapp
     * @returns {Object} THe link function
     */
    .directive('clappDisclaimer', function() {
        return {
            restrict : 'E',
            templateUrl:'views/disclaimer.html'
        }
    });
