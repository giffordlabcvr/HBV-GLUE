function visualiseFeatureAsSvg(document) {
	var visualiseFeatureResult;
	var outputFile = document.inputDocument.fileName;
	delete document.inputDocument["fileName"];
	glue.inMode("module/hbvVisualisationUtility", function() {
		visualiseFeatureResult = glue.command({ "visualise-feature": document.inputDocument });
	});
	var transformResult;
	glue.inMode("module/hbvFeatureToSvgTransformer", function() {
		transformResult = glue.command({ "transform-to-web-file": 
			{
				"webFileType": "WEB_PAGE",
				"commandDocument":{
					transformerInput: {
						featureVisualisation: visualiseFeatureResult.featureVisualisation,
						ntWidth: 16
					}
				},
				"outputFile": outputFile
			}
		});
	});
	return transformResult
}