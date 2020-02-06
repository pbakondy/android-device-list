#!/usr/bin/env node

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const axios = require( 'axios' );
const iconv = require( 'iconv-lite' );
const babyparse = require( 'babyparse' );

// https://support.google.com/googleplay/android-developer/answer/6154891?hl=en
// https://support.google.com/googleplay/answer/1727131?hl=en

// On the CSV file, devices are ordered alphabetically (A-Z) by manufacturer name and listed in the following format:
//  Retail brand, marketing name, build.os.DEVICE, build.os.MODEL

const SUPPORTED_DEVICES_CSV = 'https://storage.googleapis.com/play_public/supported_devices.csv';

const DEVICES_OUTPUT_FILE = path.join( __dirname, 'devices.json' );
const BRANDS_OUTPUT_FILE = path.join( __dirname, 'brands.json' );


function getCvs () {
  console.log( 'Downloading: ' + SUPPORTED_DEVICES_CSV );

  axios.get( SUPPORTED_DEVICES_CSV )
    .then( buildJSON )
    .catch( e => {
      console.log( 'Download failed' );
      console.log( e );
    } );
}

// convert utf-16le to utf8
function decodeRaw ( data ) {
  // check file encoding:
  // $ file -I supported_devices.csv
  // supported_devices.csv: text/plain; charset=utf-16le

  let buffer = Buffer.from( data );
  return iconv.decode( buffer, 'utf-16le' );
}

function buildJSON ( response ) {

  console.log( 'Downloaded', response.status, response.statusText );
  console.log( 'File size: ' + response.headers['content-length'] + ' bytes' );

  let devices = parseCVS( decodeRaw( response.data ) );

  // remove first row: "Retail Branding,Marketing Name,Device,Model"
  devices.shift();

  console.log( devices.length + ' devices' );

  fs.writeFile( DEVICES_OUTPUT_FILE, JSON.stringify( devices, null, 2 ), ( err ) => {
    if ( err ) {
      throw err;
    }
    console.log( 'Device list saved to ' + DEVICES_OUTPUT_FILE );
  } );

  let brands = [];
  devices.forEach( device => {
    if ( !device.brand ) {
      return;
    }
    if ( brands.indexOf( device.brand ) === -1 ) {
      brands.push( device.brand );
    }
  } );

  console.log( brands.length + ' brands' );

  fs.writeFile( BRANDS_OUTPUT_FILE, JSON.stringify( brands, null, 2 ), ( err ) => {
    if ( err ) {
      throw err;
    }
    console.log( 'Brand list saved to ' + BRANDS_OUTPUT_FILE );
  } );

}

function parseCVS ( data ) {

  let parsed = babyparse.parse( data );
  let out = [];

  parsed.data.forEach( parts => {
    if ( parts.length === 4 ) {
      out.push( {
        brand: parts[0],
        name: cleanup( parts[1] ),
        device: parts[2],
        model: cleanup( parts[3] )
      } );
    }
  } );

  return out;
}

function cleanup ( str ) {
  if ( !str ) {
    return str;
  }
  return str.replace( /\\'/g, '\'' ).replace( /\\t/g, '' ).trim();
}


// start
getCvs();
