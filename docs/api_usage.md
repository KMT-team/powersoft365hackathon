# API Reference

## Note on Powersoft 365 API

**Research & Inspiration:**
We studied the Powersoft 365 API documentation to understand retail/hospitality data structures and workflows. This research informed our inventory simulator design (products, variants, stock management). We were also excited and curious, as we had not familiarized ourselves with a company's API before—at least not to this extent.

**Why Not Integrated:**
As aspiring developers with 3 months of experience, we were hesitant to integrate the company's production API while using an external LLM (Google Gemini). We didn't want to risk exposing sensitive company data or credentials to third-party AI services during development. We took time to research safety guidelines and measures, but in the end, opted against integration due to the security risks involved.

**Future Integration:**
The Powersoft 365 API could be integrated by:
1. **Real Data Sync:** Replace localStorage with live inventory data from Powersoft API
2. **Authenticated Requests:** Use company OAuth tokens for secure API calls
3. **Read-Only Mode:** Fetch real product/variant data for realistic training scenarios
4. **Sandbox Environment:** Connect to Powersoft test environment for safe practice
5. **AI Context:** Feed real inventory state to Gemini (or, ideally, a local LLM) for context-aware tutoring