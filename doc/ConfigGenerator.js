const YAML = require('yamljs');

var path = require('path'), fs=require('fs');

let srcRoot = "src";

function isDirectory( source ){
  return fs.lstatSync(source).isDirectory()
}

const getDirectories =  source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory).map( thepath => path.basename( thepath ));

function fromDir(startPath,filter, listToAdd){
  if (!fs.existsSync(startPath)){
    console.log("no dir ",startPath);
    return;
  }

  var files=fs.readdirSync(startPath);
  for(var i=0;i<files.length;i++){
    var filename=path.join(startPath,files[i]);
    var stat = fs.lstatSync(filename);
    if (stat.isDirectory()){
      fromDir(filename,filter); //recurse
    }
    else if (filename.indexOf(filter)>=0) {
      //console.log('-- found: ',filename);
      //listToAdd.push( filename )
      listToAdd.push( path.basename(filename) )
    };
  };
};


let srcDirs = getDirectories( srcRoot ).map( sd => ({srcDirName: sd, jsFiles: []}));

srcDirs.forEach(function( srcDir ){
  fromDir( path.join( srcRoot, srcDir.srcDirName ),'.js', srcDir.jsFiles);
})

//console.log( srcDirs );



let config = {
  toc: []
}



srcDirs.forEach(function( srcDir ){
  let titleElement = {
    name: "_" + srcDir.srcDirName.toUpperCase() + ""
  }

  let localReadmePath = path.join( srcRoot, srcDir.srcDirName, "readme.md" );
  if (fs.existsSync(localReadmePath)){
    titleElement["file"] = "../" + localReadmePath;
  }

  config.toc.push( titleElement )

  let allSubSections = srcDir.jsFiles.map( section => path.basename(section, ".js"))
  config.toc = config.toc.concat( allSubSections );
})



config.toc.push( { name: "_misc"} )





let ym = YAML.stringify( config, 4 );
fs.writeFileSync('./doc/config.yml', ym);
