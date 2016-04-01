url       = require('url'),
logger    = require('tracer').colorConsole()
request   = require('request'),
Q         = require('q');

module.exports = {

  signUpTestFlightBeta: function(userEmail, userFirstName, userLastName, res) {
    var itc_login = process.env['ITUNES_CONNECT_EMAIL'],
    itc_password = process.env['ITUNES_CONNECT_PASSWORD'],
    app_id = process.env['APP_ID'],
    logged_in = false,
    userEmail = userEmail,
    userFirstName = userFirstName ? userFirstName : '', 
    userLastName = userLastName ? userLastName : ''
    baseUrl = 'https://itunesconnect.apple.com';

    var loginUrl = 'https://idmsa.apple.com/appleauth/auth/signin';
    var accountCookie;
    var completeCookie;

    function loginAndAddUser(){
      getAccountCookie()
      .then(getitCtxCookie)
      .then(addTester)
      .then(function(response){
        return res.status(200).json(response);
      }).catch(function(err){
        logger.debug('err', err);

        return res.status(400).json({message: err});
      });
    }

    function addTester(){
      var deferred = Q.defer();
      var url = baseUrl + '/WebObjects/iTunesConnect.woa/ra/user/externalTesters/' + app_id + '/';
      var params = {users: [
        {emailAddress: {errorKeys: [], value: userEmail},
          firstName: {value: userFirstName},
          lastName: {value: userLastName},
          testing: {value: true}
        }
      ]};
      request.post({url: url, headers: {'Cookie': completeCookie}, body: params, json: true}, function(error, response, body){

        if(body && body.statusCode == 'SUCCESS'){
          deferred.resolve({testFlightResponse: body});
        }
        else{
          deferred.reject(error || 'couldnt add user');
        }
      })
      return deferred.promise;
    }

    function getAccountCookie(){
      var deferred = Q.defer();
      if(accountCookie){
        deferred.resolve(accountCookie);
      }
      else{
        request.post({url: loginUrl, json: {
          "accountName": itc_login,
          "password": itc_password,
          "rememberMe": false
            }
          }, function(error, response, body){
            var cookieData = response.headers['set-cookie'];
            var myAccountCookieArray = /myacinfo=.+?;/.exec(cookieData);
            if(!myAccountCookieArray){
              deferred.reject('cant log in');
            }
            else{
              accountCookie = myAccountCookieArray[0];
              deferred.resolve(accountCookie);
            }
          }
        )
      }
      return deferred.promise;
    }

    function getitCtxCookie(){
      var deferred = Q.defer();
      if(completeCookie){
        deferred.resolve(completeCookie);
      }
      else{
        request.get({
          url : "https://itunesconnect.apple.com/WebObjects/iTunesConnect.woa",
          followRedirect : false,
          headers : {
            'Cookie': accountCookie
          },
        }, function(error, response, body) {
          cookies = response ? response.headers['set-cookie'] : null;

          if (error || !(cookies && cookies.length)) {
            error = error || new Error('There was a problem with loading the login page cookies.');
            deferred.reject(error);
          } else {
            parsedCookies = cookies.map(function(c){
              firstPart = c.match(/^.*?;/)[0];
              return firstPart;
            }).join('');
            completeCookie = accountCookie + " " + parsedCookies;
            deferred.resolve(completeCookie);
          }       
        });
        return deferred.promise;
      }
      
    }
    loginAndAddUser();
  }

}

