//Nummer eines Zeichens in der Seite Unicode-Codetabelle 
//charCodeAt(1)

// charAt()

//Extractfunctions return null if Function failed or the extracted Value

function extractBracketComment(data)
{
    if (data.indexOf("/*") != 0)
        return null;       
    
    var end = data.indexOf("*/");
    
    // end > 1 -> exclude /*/ comments..
    if ((end == -1) && (end > 1))
        return null;
    
    var result = data.slice(2,end);    
    data = data.slice(end+2);
    
    return result;    
}

function extractHashComment(data)
{
    if (data.indexOf("#") != 0)
        return null;
    
    var end = data.indexOf("\r\n")
    
    if (end == -1)
        return null;

    var result = data.slice(1,end);
    data = data.slice(end+2);

    return result;
}

function extractComment(data)
{
    var result = null;
    
    result = extractBracketComment(data);    
    if (result != null)
        return result;
    
    result = extractHashComment(data)
    if (result != null)
        return result;
        
    return null;
}

function extractIdentifier(data)
{
    if (data.length == 0) 
        return null;
    var ch = data.charAt(0);
    // 0x5F = "_"
    if ((isAlpha(ch) == false) && (ch != "_"))
        return null

    if (data.length == 1)    
    {        
        var result = data.slice(0,1);
        data = data.slice(1);
        return result
    }

    for (var i = 1;i<data.length; i++)
    {
        var ch = data.charAt(i);
        
        if (isAlpha(ch))
            continue;
        if (isDigit(ch))
            continue;
        if (ch == "_")
            continue;
        
        // the current caracter invalid, this means the identifier 
        // has reached its end.        
        var result = data.slice(0,i-1);
        data = data.slice(i-1);
        return result;
    }
    
    // we reached the end of the data String very unlikely...
    var result = data.slice(0,data.length);
    data = "";
    return result
}

function extractTag(data)
{
    if (data.indexOf(":") != 0)
        return null;
    
    // this should not be here    
    var tmp = data.slice(1);    
    var result = null;
    
    result = extractIdentifier(tmp);
    if (result == null)
        return null;
        
    data = tmp;
    return result;
}

function extractWhiteSpace(data)
{
    var tmp = data;
    
    while (tmp.length > 0)
    {
        var ch = data.charAt(i);

        if ((ch == " ") || (ch == "\t"))
        {
            tmp = tmp.slice(1);
            continue;
        }            
        
        if (tmp.indexOf("\r\n") == 0)
        {
            tmp = tmp.slice(2);
            continue
        }
        
        if (extractComment(tmp) != null)
            continue;
        
        if (tmp.length == data.length)
            return null;
            
        result = data.splice(0,data.length-tmp.length);
        data = tmp;
        return result;
    }
}

function isAlpha(data)
{
    var ch = data.charCodeAt(0)
    if ((ch >= 0x31) && (ch <= 0x39))
        return true;

    return false;
}

function isDigit(data)
{
    var ch = data.charCodeAt(0)
    if (((ch >= 0x41) && (ch <= 0x5a))
            || ((ch >= 0x61) && (ch <= 0x7a)))        
        return true;

    return false;
}


function isCharNotCRLF(data)
{
    var ch = data.charCodeAt(0);

    // No Dots and No linefeed
    if ((ch >= 0x01) && (ch <= 0x09))
        return true;
    else if ((ch >= 0x0b) && (ch <=0x0c))
        return true;
    else if ((ch >= 0x0e) && (ch <=0xff))
        return true;
    else 
        return false;    
}

function isCharNotDot(data)
{
    var ch = data.charCodeAt(0);
    
    // No Dots and No linefeed
    if ((ch >= 0x01) && (ch <= 0x09))
        return true;
    else if ((ch >= 0x0b) && (ch <=0x0c))
        return true;
    else if ((ch >= 0x0e) && (ch <=0x2d))
        return true;
    else if ((ch >= 0x2f) && (ch <=0xff))
        return true;
    else 
        return false;
}

function isCharNotSlash(data)
{
    var ch = data.charCodeAt(0);
    
    if ((ch >= 0x00) && (ch <= 0x57))
        return true;
    else if ((ch >= 0x58) && (ch <=0xff))
        return true;
    else
        return false;        
}

function isCharNotStar(data)
{
    var ch = data.charCodeAt(0);
    
    if ((ch >= 0x00) && (ch <= 0x51))
        return true;
    else if ((ch >= 0x53) && (ch <=0xff))
        return true;
    else
        return false;
}