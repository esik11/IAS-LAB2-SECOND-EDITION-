const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyBYFyx7YUkm1Usc1CR2Xcu4A5EwBq-HlY8",
    authDomain: "laravel-auth-71bf8.firebaseapp.com",
    projectId: "laravel-auth-71bf8",
    storageBucket: "laravel-auth-71bf8.appspot.com",
    messagingSenderId: "583066212163",
    appId: "1:583066212163:web:3e3bd20688f3ed68e941f6",
    measurementId: "G-GD6H2TS8MW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

module.exports = { auth }; 