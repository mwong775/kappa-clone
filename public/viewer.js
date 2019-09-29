let token = '';
let tuid = '';

const twitch = window.Twitch.ext;

// create the request options for our Twitch API calls
const requests = {
  set: createRequest('POST', 'color/cycle'),
  get: createRequest('GET', 'color/query'),
  poll: createRequest('POST', 'poll'),
  vote: createRequest('POST', 'vote'),
  getvotes: createRequest('GET', 'votes'),
};

function createRequest (type, method) {
  return {
    type: type,
    url: location.protocol + '//localhost:8081/' + method,
    success: updateBlock,
    error: logError
  };
}

function setAuth (token) {
  Object.keys(requests).forEach((req) => {
    twitch.rig.log('Setting auth headers');
    requests[req].headers = { 'Authorization': 'Bearer ' + token };
  });
}

twitch.onContext(function (context) {
  twitch.rig.log(context);
});

twitch.onAuthorized(function (auth) {
  // save our credentials
  token = auth.token;
  tuid = auth.userId;

  // enable the button
  $('#cycle').removeAttr('disabled');

  setAuth(token);
  $.ajax(requests.get);
});

function updateBlock(hex) {
  twitch.rig.log('Updating block color to: ', hex);
  $('#color').css('background-color', hex);
}

function logError(_, error, status) {
  twitch.rig.log('EBS request returned '+status+' ('+error+')');
}

function logSuccess(hex, status) {
  twitch.rig.log('EBS request returned '+hex+' ('+status+')');
}

$(function () {
  // when we click the cycle button
  $('#cycle').click(function () {
    if(!token) { return twitch.rig.log('Not authorized'); }
      twitch.rig.log('Requesting a color cycle');
      $.ajax({
        ...requests.poll, data: {
          question: 'testing adding a question',
          options: JSON.stringify([{id: '1', value: 'test1'},{id: '5', value: 'test2'},{id: '1234', value: 'actual stuff'}])
      }});
  });
  twitch.rig.log("here1")

  // when we click the vote button
  $('#vote1').click(function () {

  twitch.rig.log("here2")
    if(!token) { return twitch.rig.log('Not authorized'); }
      twitch.rig.log('Requesting a color cycle');
      $.ajax({
        ...requests.vote, data: {
          optionId: '1'
      }});
  });
  // when we click the vote button
  $('#vote2').click(function () {
    if(!token) { return twitch.rig.log('Not authorized'); }
      twitch.rig.log('Requesting a color cycle');
      $.ajax({
        ...requests.vote, data: {
          optionId: '5'
      }});
  });
  // when we click the vote button
  $('#vote3').click(function () {
    if(!token) { return twitch.rig.log('Not authorized'); }
      twitch.rig.log('Requesting a color cycle');
      $.ajax({
        ...requests.vote, data: {
          optionId: '1234'
      }});
  });


  // when we click the vote button
  $('#getvotes').click(function () {
    if(!token) { return twitch.rig.log('Not authorized'); }
      twitch.rig.log('Requesting a color cycle');
      $.ajax(requests.getvotes);
  });
});
