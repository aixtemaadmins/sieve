/* 
 * The contents of this file is licenced. You may obtain a copy of
 * the license at http://sieve.mozdev.org or request it via email 
 * from the author. Do not remove or change this comment. 
 * 
 * The initial author of the code is:
 *   Thomas Schmid <schmid-thomas@gmx.net>
 *   
 * Contibutors:
 *   Max Dittrich
 */
 
/*******************************************************************************
 
  FACTSHEET: 
  ==========
    CLASS NAME          : SieveAbstractResponse
    USES CLASSES        : SieveResponseParser
        
    CONSCTURCTOR        : SieveAbstractResponse(SieveResponseParser parser)
    DECLARED FUNCTIONS  : String getMessage()
                          String getResponse()
                          int getResponseCode()                          
                          boolean hasError()
    EXCEPTIONS          : 
    AUTHOR              : Thomas Schmid        
    
  DESCRIPTION:
  ============
    Every Sieve Response is tailed by eithern an OK, BYE or NO followed by 
    optional messages and/or error codes.
    This class is capable of parsing this part of the sieve response, therefore
    it should be implemented by and SieveResponse.

  PROTOCOL SNIPLET EXAMPLES: 
  ==========================
    'NO (0000) "Meldung"\r\n'
    'BYE (0000) {4+}\r\n1234\r\n'
    'NO \"Meldung\"\r\n'
    'BYE {4+}\r\n1234\r\n'
    'NO (0000)\r\n'
    
********************************************************************************/
function SieveAbstractResponse(parser)
{
    this.message = "";
    this.responseCode = "";
    
    // OK
    if (parser.startsWith([[79,111],[75,107]]))
    {
      this.response = 0;
      parser.extract(2);
    }
    // BYE
    else if (parser.startsWith([[66,98],[89,121],[69,101]]))
    {
      this.response = 1;
      parser.extract(3);
    }
    // NO
    else if (parser.startsWith([[78,110],[79,111]]))
    {
      this.response = 2;
      parser.extract(2);
    }
    else
      throw "NO, OK or BYE expected in "+parser.getData();

    // is there a Message?
    if (parser.isLineBreak())
    {
      parser.extractLineBreak();
      return;
    }

    // remove the space
    parser.extractSpace();

    // we found "(" so we got an responseCode    
    if (parser.startsWith([[40]]))
    {
      // remove the opening bracket
      parser.extract(1);
        
      // extract Tokens until a ")" is found
      this.responseCode = parser.extractToken(41);
        
      // remove the closing bracket
      parser.extract(1);        
        
      if (parser.isLineBreak())
      {
        parser.extractLineBreak();
        return
      }
             
      parser.extractSpace();
    }
    
    this.message = parser.extractString();
    
    parser.extractLineBreak();
}

SieveAbstractResponse.prototype.message = null;
SieveAbstractResponse.prototype.responseCode = null;
SieveAbstractResponse.prototype.response = -1;

SieveAbstractResponse.prototype.getMessage
    = function () { return this.message; }

SieveAbstractResponse.prototype.hasError
    = function ()
{
  if (this.response == 0)
    return false;

  return true;
}

SieveAbstractResponse.prototype.getResponse
    = function () { return this.response; }

SieveAbstractResponse.prototype.getResponseCode
    = function ()
{
  // If the Response Code starts with a quote skip we run into a cyrus bug. 
  // This means we need an offset of 1 first character...  
  var offset = this.responseCode[0] == '"'?1:0;
  
  if (this.responseCode.toUpperCase().indexOf("REFERRAL") == offset)
    return new SieveResponseCodeReferral(this.responseCode);
    
  if (this.responseCode.toUpperCase().indexOf("SASL") == offset)
    return new SieveResponseCodeSasl(this.responseCode);

  // TODO Implement these Response codes:
  //"ACTIVE" / "NONEXISTENT" / "ALREADYEXISTS" / "WARNINGS" 
    
  return new SieveResponseCode(this.responseCode);
}

/**
 * This class implements a generic response handler for simple sieve requests.
 * 
 * Simple Requests indicate, wether the command succeded or not. They return
 * only status information, and do not contain any data relevant for the user.
 *  
 * @param {} data
 *  a string containing the response sent by the server
 */
function SieveSimpleResponse(parser)
{
  SieveAbstractResponse.call(this,parser);
}

// Inherrit prototypes from SieveAbstractResponse...
SieveSimpleResponse.prototype.__proto__ = SieveAbstractResponse.prototype;

/**
 * Parses the capabilites posted by the ManageSieve server upon a client 
 * connection, after successful STARTTLS and AUTHENTICATE or by issuing the 
 * CAPABILITY command. 
 * 
 * @see {SieveCapabilitiesRequest}
 * 
 * @param {SieveResponseParser} parser
 *   a parser containing the response sent by the server 
 */
function SieveCapabilitiesResponse(parser)
{    
  this.implementation = null;
  this.version = 0;
  
  this.extensions = {};
  this.tls = false;
  this.sasl = {};
  
  this.maxredirects = -1;
  this.owner = ""
  this.notify = {};
  this.language = "";
  
  this.capabilities = {};
  
  while (parser.isString() )
  {
    var tag = parser.extractString();
    
    var value = "";
    if ( parser.isLineBreak() == false)
    {
      parser.extractSpace();      
      value = parser.extractString();       
    };
     
    parser.extractLineBreak();
    
    switch (tag.toUpperCase())
    {
      case "STARTTLS":
        this.tls = true;
        break;
      case "IMPLEMENTATION":
        this.implementation = value;
        break;
      case "SASL":
        this.sasl = value.split(" ");
        break;
      case "SIEVE":
        this.extensions = value.split(" ");
        break;
      case "VERSION":
        this.version = parseFloat(value);
        if (this.version < 1.0)
          break;
        
        // Version 1.0 introduced rename, noop and checkscript
        this.capabilities.renamescript = true;
        this.capabilities.noop = true;
        this.capabilities.checkscript = true;
        
        break;
      case "MAXREDIRECTS":
        this.maxredirects = parseInt(value);
        break;
      case "LANGUAGE":
        this.language = value;
        break;
      case "NOTIFY": 
        this.notify = value.split(" ");
        break;
      case "OWNER":
        this.owner = value;
        break;
      case "RENAME":
        this.capabilities.renamescript = true;
        break;
      case "NOOP":
        this.capabilities.noop = true;
        break;
    }
  } 

  if (this.implementation === null)
    throw "Implementation expected";
    
  // invoke inheritted Object constructor...
  SieveAbstractResponse.call(this,parser);  
}

// Inherrit properties from SieveAbstractResponse
SieveCapabilitiesResponse.prototype.__proto__ = SieveAbstractResponse.prototype;

SieveCapabilitiesResponse.prototype.getImplementation
    = function () { return this.implementation; }

SieveCapabilitiesResponse.prototype.getSasl
    = function () { return this.sasl; }
    
SieveCapabilitiesResponse.prototype.getExtensions
    = function () { return this.extensions; }

/**
 * Indicates wether or not TLS is supported by this implementation.
 * 
 * Note: After the command STARTTLS or AUTHENTICATE completes successfully, this 
 * value is always false.
 * 
 * @return {Boolean}
 *   true if TLS is supported, false if not.  
 */
SieveCapabilitiesResponse.prototype.getTLS
    = function () { return this.tls; }
    
/**
 * Inorder to maintain compatibility to older implementations, the servers 
 * should state their compatibility level upon login. 
 *
 * A value of "0" indicates, minimal ManageSieve support. This means the server 
 * implements the commands AUTHENTICATE, STARTTLS, LOGOUT, CAPABILITY, HAVESPACE,
 * PUTSCRIPT, LISTSCRIPTS, SETACTIVE, GETSCRIPT and DELETESCRIPT
 * 
 * A value of "1.0" adds to the minimal ManageSieve Support the commands 
 * RENAMESCRIPT, CHECKSCRIPT and NOOP.
 * 
 * @return {float}
 *   Positive Floating describing the compatibility level of the ManageSieve server.
 */
SieveCapabilitiesResponse.prototype.getVersion
    = function () { return this.version; }  

/**
 * Returns the limit on the number of Sieve "redirect" actions a script can 
 * perform during a single evaluation.
 * 
 * Note, that this is different from the total number of "redirect" actions a 
 * script can contain. 
 * 
 * @return {int}
 *   a non-negative number of redirects, or -1 for infinite redirects 
 */
SieveCapabilitiesResponse.prototype.getMaxRedirects
    = function () { return this.maxredirects; } 

/**
 * Returns a string array of URI schema parts for supported notification
 * methods. This capability is be specified, if the Sieve implementation 
 * supports the "enotify" extension.
 * 
 *  @return {String[]}
 *    The schema parts as string array
 */    
SieveCapabilitiesResponse.prototype.getNotify
    = function () { return this.notify; }

/**
 * Returns the language currently used for human readable error messages.  
 * If this capability is not returned, the "i-default" [RFC2277] language is 
 * assumed.  
 * 
 * Note that the current language might be per-user configurable (i.e. it 
 * might change after authentication)
 * 
 * @return {String}
 *   a [RFC4646] conform language tag as string 
 */    
SieveCapabilitiesResponse.prototype.getLanguage
    = function () { return this.language; }

/**
 * Returns a list with sieve commands which are supported by this implementation
 * and are not part of the absolute minimal ManageSieve support.
 * 
 * The server advertises such additional commands either by explicitely
 * naming the command or by using the compatiblility level capability. 
 * 
 * Examples are RENAME, NOOP and CHECKSCRIPT.     
 *  
 * @return {Object}
 *   an associative array containing additional sieve commands
 */
SieveCapabilitiesResponse.prototype.getCapabilities
    = function () { return this.capabilities; }        
    
/**
 * Gets the name of the logged in user.
 * 
 * Note: This value is only avaiable after AUTHENTICATE command succeeds
 * 
 * @return {String}
 *   a String containing the username
 */    
SieveCapabilitiesResponse.prototype.getOwner
    = function () { return this.owner; }    

    
//***************************************************************************//
    
function SieveListScriptResponse(parser)
{
  //    sieve-name    = string
  //    string        = quoted / literal
  //    (sieve-name [SP "ACTIVE"] CRLF) response-oknobye
  
  this.scripts = new Array();
  var i = -1;
    
  while ( parser.isString() )
  {   
        i++;

        this.scripts[i] = new Object();        
        this.scripts[i].script = parser.extractString();
        
        if ( parser.isLineBreak() )
        {        
            this.scripts[i].active = false;
            parser.extractLineBreak();
            
            continue;
        }
        
        parser.extractSpace();
        
        if (parser.extractToken(13).toUpperCase() != "ACTIVE")
            throw "Error \"ACTIVE\" expected";   

        this.scripts[i].active = true;        
        parser.extractLineBreak();
        
    }

  // invoke inheritted Object constructor...
  SieveAbstractResponse.call(this,parser);  
}

// Inherrit properties from SieveAbstractResponse
SieveListScriptResponse.prototype.__proto__ = SieveAbstractResponse.prototype;    
   
SieveListScriptResponse.prototype.getScripts
    = function () { return this.scripts; }


//*************************************
function SieveSaslLoginResponse()
{
  this.superior = null;
  this.state = 0;
}

SieveSaslLoginResponse.prototype.add
  = function (parser) 
{
  
  if ((this.state == 0) && (parser.isString()))
  {
    // String should be 'Username:' or something similar
    parser.extractString();
    parser.extractLineBreak();

    this.state++;
    return;
  }
  
  if ((this.state == 1) && (parser.isString()))
  {
    // String should be equivalten to 'Password:'
    parser.extractString();
    parser.extractLineBreak();    

    this.state++;
    return;
  }
  
  if (this.state == 2)
  {
    // Should be either a NO, BYE or OK
    this.state = 4;
    this.superior = new SieveAbstractResponse(parser);
    return;
  }
  
  // is it an error message? 
  try
  {
    this.superior = new SieveAbstractResponse(parser);
    this.state = 4;
    return;
  }
  catch (ex) 
  {
    throw 'Illegal State:'+this.state+' / '+parser.getData(0)+'\n'+ex;    
  }
    
  throw 'Illegal State:'+this.state+' / '+parser.getData(0);
}

SieveSaslLoginResponse.prototype.getState
  = function () { return this.state; }

SieveSaslLoginResponse.prototype.getMessage
  = function ()
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
      
  return this.superior.getMessage(); 
}

SieveSaslLoginResponse.prototype.hasError
  = function () 
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
    
  return this.superior.hasError(); 
}

SieveSaslLoginResponse.prototype.getResponse
  = function () 
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
      
  return this.superior.getResponse(); 
}

SieveSaslLoginResponse.prototype.getResponseCode
  = function () 
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
    
  return this.superior.getResponseCode(); 
}

//*************************************
/**
 * @author Thomas Schmid
 * @author Max Dittrich 
 */
function SieveSaslCramMd5Response()
{
  this.superior = null;
  this.state = 0;
}

SieveSaslCramMd5Response.prototype.add
  = function (parser) 
{
  
  if ((this.state == 0) && (parser.isString()))
  {
    // The challenge is contained within a string
    this.challenge = parser.extractString();
    parser.extractLineBreak();
    
    this.state++;
    
    return;
  }
  
  if (this.state == 1)
  {
    // Should be either a NO, BYE or OK
    this.state = 4;
    this.superior = new SieveAbstractResponse(parser);
    return;
  }
    
  throw 'Illegal State:'+this.state+' / '+parser.getData();
}

SieveSaslCramMd5Response.prototype.getState
  = function () { return this.state; }

SieveSaslCramMd5Response.prototype.getChallenge
  = function ()
{
  if (this.state < 1)
    throw "Illegal State, request not completed";
      
  return this.challenge; 
}

SieveSaslCramMd5Response.prototype.getMessage
  = function ()
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
      
  return this.superior.getMessage(); 
}

SieveSaslCramMd5Response.prototype.hasError
  = function () 
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
    
  return this.superior.hasError(); 
}

SieveSaslCramMd5Response.prototype.getResponse
  = function () 
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
      
  return this.superior.getResponse(); 
}

SieveSaslCramMd5Response.prototype.getResponseCode
  = function () 
{
  if (this.state != 4)
    throw "Illegal State, request not completed";
    
  return this.superior.getResponseCode(); 
}

/*********************************************************
    literal               = "{" number  "+}" CRLF *OCTET
    quoted                = <"> *1024QUOTED-CHAR <">
    response-getscript    = [string CRLF] response-oknobye
    string                = quoted / literal
**********************************************************/

function SieveGetScriptResponse(scriptName,parser)
{
  /** @private, @type {String} */ this.scriptName = scriptName;
  /** @private, @type {String} */ this.scriptBody = "";
  
  if (parser.isString())
  {
    this.scriptBody = parser.extractString();
    parser.extractLineBreak();
  }
	
  // invoke inheritted Object constructor...
  SieveAbstractResponse.call(this,parser);  
}

// Inherrit properties from SieveAbstractResponse
SieveGetScriptResponse.prototype.__proto__ = SieveAbstractResponse.prototype;    

/**
 * Conatins the requested sieve script. Script can't be locket, this means
 * several clients can manipulate a script at the same time.
 * 
 * @return {String} returns the script's content
 */    
SieveGetScriptResponse.prototype.getScriptBody
    = function () { return this.scriptBody; }

/**
 * @return {String} Containing the script's Name.
 */
SieveGetScriptResponse.prototype.getScriptName
    = function () { return this.scriptName; }        