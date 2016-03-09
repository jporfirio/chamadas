angular.module('starter.controllers').controller('MySessionCtrl', function($scope, $ionicLoading, SessionsService, $state, $stateParams, $ionicModal, $window, $ionicPopover, $ionicHistory, $cordovaToast) {
    $ionicLoading.show({
        content: 'Loading',
        animation: 'fade-in',
        showBackdrop: true,
        maxWidth: 200,
        showDelay: 0
    });

    $scope.popover = $ionicPopover.fromTemplate({
        scope: $scope
    });

    $ionicPopover.fromTemplateUrl('settings.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.popover = popover;
    });

    $scope.openPopover = function($event) {
        $scope.popover.show($event);
    };

    $scope.closePopover = function() {
        $scope.popover.hide();
    };

    function onNfc(nfcEvent) {
        var tag = nfcEvent.tag;
        var tagId = nfc.bytesToHexString(tag.id);
        $scope.updateStatusNFC(tagId);
    }

    function win() {
        console.log("Listening for NFC Tags");
    }

    function fail(error) {
        alert("Error adding NFC listener");
    }

    if (typeof nfc !== 'undefined') nfc.addTagDiscoveredListener(onNfc, win, fail);

    $service = SessionsService.getSession($stateParams['sessionid']);
    $service.then(function(resp) {
        $scope.session = (angular.fromJson(resp.data));
        updateStatus($scope.session);
        $ionicLoading.hide();
    }, function(err) {
        $window.alert("Não foi possível obter esta sessão: \n \n =(");
    }); 

    function updateStatus(session) {
        attendance_log = [];
        angular.forEach(session.attendance_log, function(log){
            attendance_log[log.studentid] = log.statusid;
        });

        if (session.attendance_log) {
            angular.forEach(session.users, function(user) {
                user.statusid = attendance_log[user.id];
                user.status = findStatus(session.statuses, parseInt(user.statusid));
            });
        }

        //Marcando status com maior peso (presença via NFC)
        var bigger = session.statuses[0];
        angular.forEach(session.statuses, function(status){
            if (status.grade > bigger.grade) {
                bigger = status;
            }
        });

        $scope.biggerStatus = bigger;
    }

    function findStatus(statuses, statusid) {
        description = ""
        angular.forEach(statuses, function(status) {
            if (status.id == statusid) {
                description = status.description;
            }
        });

        return description;
    }

    $ionicModal.fromTemplateUrl('status-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modal = modal;
    });
    
    $scope.openModal = function(user) {
        var radios = document.getElementsByClassName("radio-icon");

        for(var i = 0; i < radios.length; i++) {
            radios[i].style.visibility = "hidden";
        }
        
        $scope.modal.show();
        $scope.currentUser = user;
    };
    
    $scope.closeModal = function() {
        $scope.modal.hide();
    };

    $scope.updateStatusNFC = function(tag) {
        angular.forEach($scope.session.users, function(user) {
            if (user.rfid == tag) {
                $scope.currentUser = user;
                $scope.changeStatus($scope.biggerStatus);
                $cordovaToast.show(user.firstname + " " + user.lastname, 'short', 'bottom').then(function(success) {
                    }, function (error) {});
                }
        });
    }

    $scope.changeStatus = function(status) {
        $scope.currentUser.status = status.description;
        $scope.currentUser.statusid = status.id;
        $scope.currentUser = null;
        $scope.closeModal();
    };

    $scope.takeAttendance = function (session) {
        var users = {};
        var session_info = {};
        var proceed = true;

        angular.forEach(session.users, function(user) {
            if (typeof user.statusid == 'undefined') {
                proceed = false;
            }
            
            var current_user = {"id": user.id, "statusid": user.statusid, "remarks": ""};
            users[user.id] = current_user;
        });

        statusset = "";
        angular.forEach(session.statuses, function(status) {
            if (statusset) {
                statusset = statusset + "," + status.id;
            } else {
                statusset = status.id;
            }
        });

        var d = new Date();
        var time = d.getTime();
        session_info = {"statusset": statusset, "id": session.id, "timetaken": time, "takenby": 103};

        if (proceed) {
            $ionicLoading.show({
                content: 'Loading',
                animation: 'fade-in',
                showBackdrop: true,
                maxWidth: 200,
                showDelay: 0
            });

            $service = SessionsService.takeAttendance(angular.toJson(users), angular.toJson(session_info));
            $service.then(function(resp) {
                $ionicLoading.hide();
                $window.alert("Sucesso!!");
                $state.go('my_sessions', {'id':103});
            }, function(err) {
                $window.alert("Não foi possível enviar esta sessão: \n \n =(");
                $ionicLoading.hide();    
            });
        } else {
            $window.alert("Ainda existem usuários com estado indefinido!!!");
        }
    }

    $scope.logout = function() {
        $ionicHistory.nextViewOptions ({
            disableBack: true
        });
        $scope.popover.hide();

        url = window.localStorage['siteUrl'] + '/login/logout.php';
    
        var ref = window.open(url, '_blank');
        
        ref.addEventListener('loadstart', function(event) {
            if (!event.url.match('logout')) ref.close();
        });

        window.localStorage['token'] = '';

        ref.addEventListener('exit', function(event) {
            $state.go('login');
        });
    };

    $scope.updateAll = function(status) {
        angular.forEach($scope.session.users, function(user) {
            user.status = status.description;
            user.statusid = status.id;
        });

        $scope.popover.hide();
    }
})