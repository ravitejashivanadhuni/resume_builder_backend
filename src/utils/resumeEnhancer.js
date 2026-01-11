const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const enhanceResume = async (resumeText, jobTitle) => {
  try {
    if (!resumeText || !jobTitle) {
      throw new Error("Invalid input: resumeText and jobTitle are required.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `As a professional resume writer and career coach, enhance the following resume to better target the position of "${jobTitle}". 
    Focus on:
    - Highlighting relevant skills and experiences
    - Using industry-specific keywords
    - Quantifying achievements where possible
    - Improving clarity and impact
    - Maintaining professional tone
    - Ensuring ATS-friendly formatting

    ### Original Resume:
    ${resumeText}

    Please provide the enhanced resume in markdown format, keeping a professional structure.`;

    console.log("Generating AI-enhanced resume...");
    const result = await model.generateContent(prompt);

    console.log("Raw AI Response:", JSON.stringify(result, null, 2));

    // Extract AI-enhanced resume content safely
    let enhancedResume = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Enhancement failed";

    // Remove Markdown formatting if necessary
    enhancedResume = enhancedResume.replace(/```markdown\n|\n```/g, '');

    return enhancedResume;
  } catch (error) {
    console.error("Error in resume enhancement:", error.message || error);
    throw new Error("Failed to enhance resume. Please try again.");
  }
};

module.exports = { enhanceResume };
