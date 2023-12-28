'use strict';

angular.module('hitsaOis')
    .constant('config', {
        'apiUrl': 'https://tahvel.edu.ee/hois_back',
        'idCardLoginUrl': 'https://id.tahvel.edu.ee',
        'mobileIdInitialDelay': 5000,
        'mobileIdPollInterval': 4000,
        'mobileIdMaxPolls': 15,
        'timeoutDialogBeforeTimeoutInSeconds': 180,
        'ehis2GraduationEnabled': true,
        'ekisUrl': 'https://ekis.ee/?wdsturi=3Dpage%3=Dview_dynobj%26pid%3D',
        'production': true,
        'schoolBoardRedirectInSeconds': 60,
        'schoolBoardRefreshInSeconds': 60
    });
