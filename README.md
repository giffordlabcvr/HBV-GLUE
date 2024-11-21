HBV-GLUE: Comparative Genomics of Hepatitis B Virus
===================================================

### Overview

<img src="md/glue-logo.png" align="right" alt="" width="280"/>

HBV-GLUE is a sequence-oriented resource for comparative genomic analysis of hepatitis B virus (HBV), developed using the [GLUE](https://github.com/giffordlabcvr/gluetools) software framework.

GLUE is an open, integrated software toolkit designed for storing and interpreting sequence data. It supports the creation of bespoke projects, incorporating essential data items for comparative genomic analysis, such as sequences, multiple sequence alignments, genome feature annotations, and other associated data.

Projects are loaded into the GLUE "engine," forming a relational database that represents the semantic relationships between data items. This foundation supports systematic comparative analyses and the development of sequence-based resources.

HBV-GLUE provides a command line interface (CLI) and can be installed locally, opting either for a **[Docker-based](https://github.com/giffordlabcvr/HBV-GLUE/wiki/Docker-Installation)** or **[native installation](https://github.com/giffordlabcvr/HBV-GLUE/wiki/Native-Installation)**.

* * * * *

### Web Access

You can also use some of HBV-GLUE's functionality via its web UI.

**A web instance of HBV-GLUE incorporating extension layers is hosted by the University of Glasgow, and can be accessed [here](http://hbv-glue.cvr.gla.ac.uk/)**.

* * * * *

### Key Features

-   **GLUE Framework Integration**: Built on the GLUE software framework, HBV-GLUE offers an extensible platform for efficient, standardized, and reproducible computational genomic analysis of HBV.

-   **Phylogenetic Structure**: The data in HBV-GLUE is organized in a phylogenetically-structured manner, allowing users to explore evolutionary relationships easily.

-   **Automated Updates**: HBV-GLUE provides an automatically-updated collection of HBV sequence data, ensuring users have access to the latest information for their analyses.

-   **Rich Annotations**: Annotated reference sequences enable rigorous comparative genomic analysis related to conservation, adaptation, structural context, and genotype-to-phenotype associations.

-   **Automated Genotyping**: HBV-GLUE can perform automated genotyping of HBV sequences (including subgenomic sequences) using GLUE's maximum likelihood clade assignment (MLCA) algorithm, as described [here](https://doi.org/10.1186/s12859-018-2459-9).

-   **Web user interface**: The [HBV-GLUE-WEB](https://github.com/giffordlabcvr/HBV-GLUE-WEB) extension project defines a web user interface that supports online browsing of the HBV-GLUE sequence database, and provides web access to an in-built sequence analysis tool (provides genotyping, analysis, and visualization of submitted FASTA sequences).

-   **Exploratory and operational**: The GLUE framework allows sequence-based resources to be used for exploratory work in a research setting, as well as operational work in a public health setting.

* * * * *

### Extension Layers

This **HBV-GLUE** base project can be extended with additional layers, openly available via GitHub, including:

-   **[NCBI-HBV-GLUE](https://github.com/giffordlabcvr/NCBI-HBV-GLUE)**: extends HBV-GLUE through the incorporation of all HBV sequence data published in NCBI GenBank.
-   **[HBV-DRUG-RESISTANCE](https://github.com/giffordlabcvr/HBV_DRUG_RESISTANCE)**: a drug resistance-focused extension incorporating an analysis tool that provides genotypic assessment of drug resistance/susceptibility.
-   **[HBV-GLUE-WEB](https://github.com/giffordlabcvr/HBV-GLUE-WEB)**: a web interface that can be used to create an HBV-GLUE web-server.

* * * * *

Installation
------------

To install HBV-GLUE, you can either opt for a **[Docker-based](https://github.com/giffordlabcvr/HBV-GLUE/wiki/Docker-Installation)** or **[native installation](https://github.com/giffordlabcvr/HBV-GLUE/wiki/Native-Installation)** depending on your preferences and system setup.

* * * * *

Data Sources
------------

HBV-GLUE relies on the following data sources:

-   [NCBI Nucleotide](https://www.ncbi.nlm.nih.gov/nuccore)
-   [NCBI Taxonomy](https://www.ncbi.nlm.nih.gov/taxonomy)

* * * * *

Contributing
------------

We welcome contributions from the community! If you're interested in contributing to HBV-GLUE, please review our [Contribution Guidelines](./md/CONTRIBUTING.md).

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](./md/code_of_conduct.md)

* * * * *

License
-------

The project is licensed under the [GNU Affero General Public License v. 3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)

* * * * *

Contact
-------

For questions, issues, or feedback, please contact us at <gluetools@gmail.com> or open an issue on the [GitHub repository](https://github.com/giffordlabcvr/HBV-GLUE/issues).

* * * * * 
