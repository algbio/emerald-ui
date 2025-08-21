---
marp: true
theme: gaia
paginate: false
backgroundColor: #eafbe9
color: #333333
style: |
  section {
    font-size: 28px;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  h1 {
    font-size: 48px;
    line-height: 1.2;
  }
  h2 {
    font-size: 40px;
    line-height: 1.2;
  }
  h3 {
    font-size: 36px;
    line-height: 1.3;
  }
  code {
    font-size: 24px;
    word-break: break-all;
  }
  pre {
    overflow-x: auto;
    font-size: 22px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  ul, ol {
    margin: 0.5em 0;
  }
  li {
    margin: 0.3em 0;
    word-wrap: break-word;
  }
  blockquote {
    font-size: 26px;
    line-height: 1.4;
  }
  a {
    word-break: break-word;
  }


---

<!-- _class: lead -->
<!-- _paginate: false -->

# Building EMERALD-UI
## a protein alignment visualization tool for EMERALD

Presenter: Andrei Preoteasa  
Research Group: Algorithmic Bioinformatics Lab  
Project: [emerald-ui](https://algbio.github.io/emerald-ui)

---

# Presentation Structure
## What We'll Cover Today

1. **Background & Motivation**  

2. **Limitations of Traditional Methods**  

3. **EMERALD Algorithm**  

4. **EMERALD UI Overview**  

5. **Technical Implementation**  

6. **EMERALD-UI In Action**

---
# Background & Motivation
## Why Protein Alignment Matters

Proteins are the workhorses of biology, and comparing their sequences helps us understand function, evolution, and disease.

#### Example Protein Alignment:
```
A: MKTAYIAKQRQISFVKSHFSRQ
B: MKTA--AKQRQISFVKSHFSRQ

Match: +5   Mismatch: -2   Gap: -6
```
---

### How Are Proteins Aligned?
- **Sequence alignment algorithms** compare amino acid sequences to find similarities.
- **Cost matrices** (e.g., BLOSUM, PAM) assign scores for matches, mismatches, and gaps.
- The goal: **maximize total score** by aligning similar regions and penalizing differences.

<center>
<img src="./images/blosum62.png" alt="BLOSUM62 Matrix" width="600" style="border: 2px solid #ddd; border-radius: 8px; margin-top: 20px;"/>
<br><i>BLOSUM62 substitution matrix showing amino acid similarity scores</i>
</center>


---

# Issues in Protein Alignment

- **Multiple Valid Alignments:** Different alignments may be equally plausible.
- **Gap Placement:** Deciding where to insert gaps affects biological interpretation.
- **Scoring Bias:** Choice of cost matrix influences which regions align.
- **Functional Relevance:** Not all aligned regions are biologically meaningful.

---

Instead of finding **one "optimal" alignment**, what if we could:

- **Explore the alignment landscape** - Find all good alignments, not just the best  
- **Identify trustworthy regions** - Discover where alignments consistently agree  
- **Reduce scoring bias** - See robust patterns across different parameters  
- **Focus on functional relevance** - Highlight biologically meaningful regions  

### The EMERALD Approach:
> **If multiple high-scoring alignments agree on a region,  
> that region is probably functionally important!**

This is exactly what **EMERALD** does - it reveals which parts of your alignment you can trust.

---

# EMERALD by itself

**EMERALD** is a terminal application for generating protein alingments written in C++.


### Issues
- App only gives raw data, which is hard to interpret
- Only work in the terminal, which is hard to use
- Limited input methods

<center>
<img src="./images/Screenshot%20from%202025-08-18%2015-43-42.png" alt="EMERALD Terminal Application" width="800" style="border: 2px solid #ddd; border-radius: 8px; margin-top: 20px;"/>
</center>


---
# How EMERALD-UI Solves These Problems

- **Intuitive Visualization:** Draws an interactive, easy-to-use graph from raw EMERALD output.
- **Accessible Interface:** Runs in the browser, no terminal required.
- **Flexible Input:** Paste sequences, upload files, or search directly from UniProt.
- **Alignment Confidence:** Highlights common areas of multiple alignments.
- **Parameter Exploration:** Instantly adjust scoring and see how alignments change.
- **Safety Windows Visualization:** Highlights common regions in 3D structures of proteins.

---

# Technology Stack

<table>
    <tr>
        <td align="center">
            <img src="./images/React-icon.svg.png" alt="React" width="90"/><br>
            <b>React</b><br>
            Modern UI framework for building interactive web applications.   <td align="center">
                <img src="./images/typescript.svg" alt="TypeScript" width="90"/><br>
                <b>TypeScript</b><br>
                Type-safe code for reliability and maintainability.
            </td>    </td>
            <td align="center">
                <img src="./images/WebAssembly_Logo.svg.png" alt="WebAssembly" width="90"/><br>
                <b>WebAssembly (WASM)</b><br>
                Runs EMERALD executable in-browser.
            </td>
            </tr>
            <tr>
            <td align="center">
                <img src="./images/Logo_D3.svg.png" alt="D3.js" width="90"/><br>
                <b>D3.js</b><br>
                Interactive, data-driven visualizations.
            </td>
            <td align="center">
                <img src="./images/og-uniprot-wide-logo-1200x600.png" alt="UniProt" width="200"/><br>
                <b>UniProt API</b><br>
                Direct protein sequence search.
            </td>
            <td align="center">
                <img src="./images/molstar-logo.png" alt="Mol*" width="200"/><br>
                <b>Mol*</b><br>
                3D protein structure visualization.
            </td>
    </tr>
</table>

---

# Demo Time

## Let's see EMERALD-UI in action!
---

<!-- _class: lead -->

# Thank You!

## Questions?

Feel free to ask about EMERALD-UI, protein alignment, or anything from today's presentation.

