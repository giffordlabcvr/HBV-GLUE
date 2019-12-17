
var featuresList = [
		             { name: "PRE_C",
		            	 displayName: "Pre-C"
		             },
		             { name: "C",
		            	 displayName: "C"
		             },
		             { name: "P",
		            	 displayName: "P"
		             },
		             { name: "RT",
		            	 displayName: "RT"
		             },
		             { name: "PRE_S1",
		            	 displayName: "Pre-S1"
		             },
		             { name: "PRE_S2",
		            	 displayName: "Pre-S2"
		             },
		             { name: "S",
		            	 displayName: "S"
		             },
		             { name: "X",
		            	 displayName: "X"
		             }
		];

function reportFastaWeb(base64, filePath) {
	glue.log("FINE", "hbvReportingController.reportFastaWeb invoked");
	var fastaDocument;
	glue.inMode("module/hbvFastaUtility", function() {
		fastaDocument = glue.command(["base64-to-nucleotide-fasta", base64]);
	});
	var numSequencesInFile = fastaDocument.nucleotideFasta.sequences.length;
	if(numSequencesInFile == 0) {
		throw new Error("No sequences found in FASTA file");
	}
	var maxSequencesWithoutAuth = 50;
	if(numSequencesInFile > maxSequencesWithoutAuth && !glue.hasAuthorisation("hbvFastaAnalysisLargeSubmissions")) {
		throw new Error("Not authorised to analyse FASTA files with more than "+maxSequencesWithoutAuth+" sequences");
	}
	result = reportDocument({
		reportFastaDocument: {
			"fastaDocument": fastaDocument, 
			"filePath": filePath
		}
	});
	glue.setRunningDescription("Collating report");
	return result;
}

function reportDocument(document) {
	var filePath = document.reportFastaDocument.filePath;
	var fastaDocument = document.reportFastaDocument.fastaDocument;
	var fastaMap = {};
	var resultMap = {};
	var placerResultContainer = {};
	// apply blast recogniser / genotyping together on set, as this is more efficient.
	initResultMap(fastaDocument, fastaMap, resultMap, placerResultContainer);
	// apply report generation to each sequence in the set.
	var hbvReports = _.map(fastaDocument.nucleotideFasta.sequences, function(sequence) {
		return generateSingleFastaReport(_.pick(fastaMap, sequence.id), _.pick(resultMap, sequence.id), filePath);
	});
	var result = {
		hbvWebReport:  { 
			results: hbvReports, 
			placerResult: placerResultContainer.placerResult
		}
	};

	glue.log("FINE", "hbvReportingController.reportFastaWeb result", result);
	
	return result;
}

/**
 * Entry point for generating a report for a fasta file containing a single sequence.
 */
function reportFasta(fastaFilePath) {
	glue.log("FINE", "hbvReportingController.reportFasta invoked, input file:"+fastaFilePath);
	// Load fasta and put in a fastaMap
	var fastaDocument;
	glue.inMode("module/hbvFastaUtility", function() {
		fastaDocument = glue.command(["load-nucleotide-fasta", fastaFilePath]);
	});
	var numSequencesInFile = fastaDocument.nucleotideFasta.sequences.length;
	if(numSequencesInFile == 0) {
		throw new Error("No sequences found in FASTA file");
	}
	if(numSequencesInFile > 1) {
		throw new Error("Please use only one sequence per FASTA file");
	}
	var fastaMap = {};
	var resultMap = {};
	var placerResultContainer = {};
	initResultMap(fastaDocument, fastaMap, resultMap, placerResultContainer);
	var singleFastaReport = generateSingleFastaReport(fastaMap, resultMap, fastaFilePath);
	singleFastaReport.hbvReport["placerResult"] = placerResultContainer.placerResult;
	return singleFastaReport;
}

function initResultMap(fastaDocument, fastaMap, resultMap, placerResultContainer) {
	glue.log("FINE", "hbvReportingController.initResultMap fastaDocument:", fastaDocument);
	_.each(fastaDocument.nucleotideFasta.sequences, function(sequenceObj) {
		fastaMap[sequenceObj.id] = sequenceObj;
	});
	// initialise result map.
	var sequenceObjs = _.values(fastaMap);
	_.each(sequenceObjs, function(sequenceObj) {
		resultMap[sequenceObj.id] = { id: sequenceObj.id };
	});
	
	// apply recogniser to fastaMap
	recogniseFasta(fastaMap, resultMap);

	// apply rotator to fastaMap
	rotateFasta(fastaMap, resultMap);

	
	glue.log("FINE", "hbvReportingController.initResultMap, result map after recogniser", resultMap);

	// apply genotyping
	genotypeFasta(fastaMap, resultMap, placerResultContainer);

	glue.log("FINE", "hbvReportingController.initResultMap, result map after genotyping", resultMap);
}

function rotateFasta(fastaMap, resultMap) {
	var rotationFastaMap = {};
	_.each(_.values(resultMap), function(resultObj) {
		if(resultObj.isForwardHbv && !resultObj.isReverseHbv) {
			rotationFastaMap[resultObj.id] = fastaMap[resultObj.id];
		} 
	});
	if(!_.isEmpty(rotationFastaMap)) {
		var numSeqs = _.values(rotationFastaMap).length;
		glue.setRunningDescription("Rotation for "+numSeqs+" sequence"+((numSeqs > 1) ? "s" : ""));

		var rotationResultObjs;
		glue.inMode("module/hbvBlastSequenceRotator", function() {
			rotationResultObjs = glue.tableToObjects(glue.command({
				"rotate": {
					"fasta-document": {
						"fastaCommandDocument": {
							"nucleotideFasta" : {
								"sequences": _.values(rotationFastaMap)
							}
						}
					}
				}
			}));
		});
		_.each(rotationResultObjs, function(rotationResultObj) {
			resultMap[rotationResultObj.querySequenceId].rotationStatus = rotationResultObj.status;
			resultMap[rotationResultObj.querySequenceId].rotationNts = rotationResultObj.rotationNts;
			if(rotationResultObj.status == "ROTATION_NECESSARY") {
				resultMap[rotationResultObj.querySequenceId].rotationSuccess = true;
				var seq = fastaMap[rotationResultObj.querySequenceId].sequence;
				fastaMap[rotationResultObj.querySequenceId].sequence = rightRotate(seq, rotationResultObj.rotationNts);
			} else if(rotationResultObj.status == "NO_ROTATION_NECESSARY") {
				resultMap[rotationResultObj.querySequenceId].rotationSuccess = true;
			} else {
				resultMap[rotationResultObj.querySequenceId].rotationSuccess = false;
			}
		});

	}
}


// rotates s towards left by d  
function leftRotate(str, d) { 
	return str.slice(d) + str.slice(0, d); 
} 

// rotates s towards right by d  
function rightRotate(str, d) { 
	return leftRotate(str, str.length() - d); 
} 

function generateQueryToTargetRefSegs(targetRefName, nucleotides) {
	var alignerModule;
	glue.inMode("module/hbvFastaSequenceReporter", function() {
		alignerModule = glue.command(["show", "property", "alignerModuleName"]).moduleShowPropertyResult.propertyValue;
	});
	var alignResult;
	glue.inMode("module/"+alignerModule, function() {
		alignResult = glue.command({align: {
				referenceName: targetRefName,
				sequence: [
				    { 
				    	queryId: "query", 
				    	nucleotides: nucleotides
				    }
				]
			}
		});
		glue.log("FINE", "hbvReportingController.generateQueryToTargetRefSegs, alignResult", alignResult);
	});
	return alignResult.compoundAlignerResult.sequence[0].alignedSegment;
	
}

function generateFeaturesWithCoverage(targetRefName, queryToTargetRefSegs) {
	var featuresWithCoverage = []; 
	
	_.each(featuresList, function(feature) {
		glue.inMode("module/hbvFastaSequenceReporter", function() {
			var coveragePercentage = glue.command({
				"alignment-feature-coverage" :{
							"queryToTargetSegs": {
								queryToTargetSegs: {
									alignedSegment: queryToTargetRefSegs
								}
							},
							"targetRefName":targetRefName,
							"relRefName":"REF_NUMBERING_X02763",
							"linkingAlmtName":"AL_UNCONSTRAINED",
							"featureName":feature.name
						}
			}).fastaSequenceAlignmentFeatureCoverageResult.coveragePercentage;
			
			var featureCopy = _.clone(feature);
			featureCopy.coveragePct = coveragePercentage;
			featuresWithCoverage.push(featureCopy);
		});
	});
	return featuresWithCoverage;
}

function generateSingleFastaReport(fastaMap, resultMap, fastaFilePath) {
	
	_.each(_.values(resultMap), function(sequenceResult) {
		var genotypingResult = sequenceResult.genotypingResult;
		if(genotypingResult != null) {
			if(genotypingResult.genotypeCategoryResult.finalClade != null) {
				var targetRefName = genotypingResultToTargetRefName(genotypingResult);
				var nucleotides = fastaMap[sequenceResult.id].sequence;
				var queryToTargetRefSegs = generateQueryToTargetRefSegs(targetRefName, nucleotides);
				var queryNucleotides = fastaMap[sequenceResult.id].sequence;
				var queryRotationNts = sequenceResult.rotationNts;
				sequenceResult.featuresWithCoverage = generateFeaturesWithCoverage(targetRefName, queryToTargetRefSegs);
				
				sequenceResult.targetRefName = targetRefName;
				
				sequenceResult.visualisationHints = visualisationHints(queryNucleotides, queryRotationNts, targetRefName, genotypingResult, queryToTargetRefSegs);
			}
		}
	});
	
	var results = _.values(resultMap);
	
	var hbvReport = { 
		hbvReport: {
			sequenceDataFormat: "FASTA",
			filePath: fastaFilePath,
			sequenceResult: results[0]
		}
	};
	addOverview(hbvReport);

	glue.log("FINE", "hbvReportingController.generateSingleFastaReport hbvReport:", hbvReport);
	return hbvReport;
}
function visualisationHints(queryNucleotides, queryRotationNts, targetRefName, genotypingResult, queryToTargetRefSegs) {
	// consider the target ref, subtype ref, genotype ref and master ref as comparison refs.
	var comparisonReferenceNames = ["REF_MASTER_NC_003977"];
	var genotypeAlmtName = genotypingResult.genotypeCategoryResult.finalClade;
	if(genotypeAlmtName != null) {
		glue.inMode("alignment/"+genotypeAlmtName, function() {
			comparisonReferenceNames.push(glue.command(["show", "reference"]).showReferenceResult.referenceName);
		});
	}
	var subgenotypeAlmtName = genotypingResult.subgenotypeCategoryResult.finalClade;
	if(subgenotypeAlmtName != null) {
		glue.inMode("alignment/"+subgenotypeAlmtName, function() {
			comparisonReferenceNames.push(glue.command(["show", "reference"]).showReferenceResult.referenceName);
		});
	}
	comparisonReferenceNames.push(targetRefName);
	var seqs = [];
	var comparisonRefs = [];
	
	// eliminate duplicates and enhance with display names.
	_.each(comparisonReferenceNames, function(refName) {
		glue.inMode("reference/"+refName, function() {
			var seqID = glue.command(["show", "sequence"]).showSequenceResult["sequence.sequenceID"];
			if(seqs.indexOf(seqID) < 0) {
				seqs.push(seqID);
				var refDisplayName = glue.command(["show", "property", "displayName"]).propertyValueResult.value;
				if(refDisplayName == null) {
					refDisplayName = "Closest Reference ("+seqID+")";
				}
				comparisonRefs.push({
					"refName": refName,
					"refDisplayName": refDisplayName
				});
			}
		});
	});
	
	var queryDetails = [];
	
	
	return {
		"features": featuresList,
		"comparisonRefs": comparisonRefs,
		"targetReferenceName":targetRefName,
		"queryNucleotides":queryNucleotides,
		"queryRotationNts":queryRotationNts,
		"queryToTargetRefSegments": queryToTargetRefSegs,
		"queryDetails": queryDetails
	};
}

/*
 * Given a genotypingResult with a non-null final major clade, return the name of the "target" reference
 */
function genotypingResultToTargetRefName(genotypingResult) {
	var targetRefSourceName;
	var targetRefSequenceID;
	var subtypeFinalClade = genotypingResult.subgenotypeCategoryResult.finalClade;
	if(subtypeFinalClade != null) {
		targetRefSourceName = genotypingResult.subgenotypeCategoryResult.closestTargetSourceName;
		targetRefSequenceID = genotypingResult.subgenotypeCategoryResult.closestTargetSequenceID;
	} else {
		targetRefSourceName = genotypingResult.genotypeCategoryResult.closestTargetSourceName;
		targetRefSequenceID = genotypingResult.genotypeCategoryResult.closestTargetSequenceID;
	}
	var targetRefOptions = glue.tableToObjects(glue.command([
         "list", "reference", 
         "--whereClause", "sequence.source.name = '"+targetRefSourceName+"' and sequence.sequenceID = '"+targetRefSequenceID+"'"]));
	return targetRefOptions[0].name;
}

/*
 * This function takes a fastaMap of id -> { id, nucleotideFasta }, and a result map of id -> ? 
 * and runs max likelihood genotyping on the subset of sequences that have been identified as forward HBV.
 * The the genotyping result object is recorded in the result map for each sequence.
 */
function genotypeFasta(fastaMap, resultMap, placerResultContainer) {
	var genotypingFastaMap = {};
	_.each(_.values(resultMap), function(resultObj) {
		if(resultObj.isForwardHbv && !resultObj.isReverseHbv) {
			genotypingFastaMap[resultObj.id] = fastaMap[resultObj.id];
		} 
	});
	if(!_.isEmpty(genotypingFastaMap)) {

		var numSeqs = _.values(genotypingFastaMap).length;
		glue.setRunningDescription("Phylogenetic placement for "+numSeqs+" sequence"+((numSeqs > 1) ? "s" : ""));

		// run the placer and generate a placer result document
		var placerResultDocument;
		glue.inMode("module/hbvMaxLikelihoodPlacer", function() {
			placerResultDocument = glue.command({
				"place": {
					"fasta-document": {
						"fastaCommandDocument": {
							"nucleotideFasta" : {
								"sequences": _.values(genotypingFastaMap)
							}
						}
					}
				}
			});
		});
		placerResultContainer.placerResult = placerResultDocument;
		

		
		// list the query summaries within the placer result document
		var placementSummaries;
		glue.inMode("module/hbvMaxLikelihoodPlacer", function() {
			placementSummaries = glue.tableToObjects(glue.command({
				"list": {
					"query-from-document": {
						"placerResultDocument": placerResultDocument
					}
				}
			}));
		});

		// for each query in the placer results.
		_.each(placementSummaries, function(placementSummaryObj) {
			var queryName = placementSummaryObj.queryName;
			
			var placements;
			
			// list the placements for that query.
			glue.inMode("module/hbvMaxLikelihoodPlacer", function() {
				placements = glue.tableToObjects(glue.command({
					"list": {
						"placement-from-document": {
							"queryName": queryName,
							"placerResultDocument": placerResultDocument
						}
					}
				}));
			});

			resultMap[queryName].placements = placements;
		});
		
		
		var genotypingResults;
		glue.inMode("module/hbvMaxLikelihoodGenotyper", function() {
			genotypingResults = glue.command({
				"genotype": {
					"placer-result-document": {
						"placerResultDocument": placerResultDocument, 
						"documentResult" : true
					}
				}
			}).genotypingDocumentResult.queryGenotypingResults;
		});
		glue.log("FINE", "hbvReportingController.genotypeFasta genotypingResults:", genotypingResults);
		_.each(genotypingResults, function(genotypingResult) {
			genotypingResult.genotypeCategoryResult = _.find(genotypingResult.queryCladeCategoryResult, 
					function(cladeCategoryResult) { return cladeCategoryResult.categoryName == "genotype"; });
			genotypingResult.subgenotypeCategoryResult = _.find(genotypingResult.queryCladeCategoryResult, 
					function(cladeCategoryResult) { return cladeCategoryResult.categoryName == "subgenotype"; });
			if(genotypingResult.genotypeCategoryResult.finalCladeRenderedName == null) {
				genotypingResult.genotypeCategoryResult.shortRenderedName = "Unknown";
			} else {
				genotypingResult.genotypeCategoryResult.shortRenderedName = 
					genotypingResult.genotypeCategoryResult.finalCladeRenderedName;
			}
			if(genotypingResult.subgenotypeCategoryResult.finalCladeRenderedName == null) {
				var genotypeHasChildren = false;
				if(genotypingResult.genotypeCategoryResult.finalClade != null) {
					glue.inMode("alignment/"+genotypingResult.genotypeCategoryResult.finalClade, function() {
						var numChildren = glue.tableToObjects(glue.command(["list", "children"])).length;
						genotypeHasChildren = numChildren > 0;
					});
				}
				if(genotypeHasChildren) {
					genotypingResult.subgenotypeCategoryResult.shortRenderedName = "Unknown";
				} else {
					genotypingResult.subgenotypeCategoryResult.shortRenderedName = "N/A";
				}
			} else {
				genotypingResult.subgenotypeCategoryResult.shortRenderedName = 
					genotypingResult.subgenotypeCategoryResult.finalCladeRenderedName;
			}
			glue.log("FINE", "hbvReportingController.genotypeFasta genotypeCategoryResult", genotypingResult.genotypeCategoryResult);
			glue.log("FINE", "hbvReportingController.genotypeFasta subgenotypeCategoryResult", genotypingResult.subgenotypeCategoryResult);
			
			
			resultMap[genotypingResult.queryName].genotypingResult = genotypingResult;
		});
	}
}

/*
 * Use the fastaUtility module to reverse complement a FASTA string
 */
function reverseComplement(fastaString) {
	var reverseComplement;
	glue.inMode("module/hbvFastaUtility", function() {
		var reverseComplementResult = 
			glue.command(["reverse-complement", "string", 
			              "--fastaString", fastaString]);
		reverseComplement = reverseComplementResult.reverseComplementFastaResult.reverseComplement;
	});
	return reverseComplement;
}

/*
 * This function takes a fastaMap of id -> { id, nucleotideFasta }, and a result map of id -> ? 
 * and runs BLAST recogniser, to determine whether the sequence is HBV, and if so, whether 
 * it is in the forward direction or reverse complement.
 * The result map will have isForwardHbv set to true if a forward hit was found, false otherwise
 * It will have isReverseHbv set to true if a reverse hit was found, false otherwise
 */
function recogniseFasta(fastaMap, resultMap) {
	var sequenceObjs = _.values(fastaMap);
	_.each(_.values(resultMap), function(resultObj) {
		resultObj.isForwardHbv = false;
		resultObj.isReverseHbv = false;
	});
	var fastaDocument = {
		"nucleotideFasta" : {
			"sequences" : sequenceObjs
		}
	};
	var numSeqs = sequenceObjs.length;
	glue.setRunningDescription("Sequence recognition for "+numSeqs+" sequence"+((numSeqs > 1) ? "s" : ""));
	var recogniserResults;
	glue.inMode("module/hbvSequenceRecogniser", function() {
		recogniserResults = glue.tableToObjects(glue.command({
				"recognise": {
					"fasta-document": {
						"fastaCommandDocument": fastaDocument
					}
				}
		}));
	});
	glue.log("FINE", "hbvReportingController.reportFasta recogniserResults:", recogniserResults);
	_.each(recogniserResults, function(recogniserResult) {
		if(recogniserResult.direction == 'FORWARD') {
			resultMap[recogniserResult.querySequenceId].isForwardHbv = true;
		} else if(recogniserResult.direction == 'REVERSE') {
			resultMap[recogniserResult.querySequenceId].isReverseHbv = true;
		} 
	});
}

function addOverview(hbvReport) {
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; // January is 0!
	var yyyy = today.getFullYear();
	if(dd < 10) {
	    dd = '0'+dd
	} 
	if(mm < 10) {
	    mm = '0'+mm
	} 
	hbvReport.hbvReport.reportGenerationDate = dd + '/' + mm + '/' + yyyy;
	hbvReport.hbvReport.engineVersion = 
		glue.command(["glue-engine","show-version"]).glueEngineShowVersionResult.glueEngineVersion;
	hbvReport.hbvReport.projectVersion = 
		glue.command(["show","setting","project-version"]).projectShowSettingResult.settingValue;
	
}

