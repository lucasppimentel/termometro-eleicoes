import axios from "axios";
// import neo4j from "neo4j-driver";
// Note: We no longer import initializeDatabase as the test manages its own setup

// --- Neo4j Database Configuration for tests ---
// const uri = "bolt://localhost:7687";
// const user = "neo4j";
// const password = "my-super-secret-password";
// const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Base URL for the API routes
const baseUrl = "http://localhost:3000/api/v1";

describe("Speeches API", () => {
  it("should create a new speech via POST and retrieve it", async () => {
    // 1. Define the data for the new speech
    const newSpeechData = {
      speakerName: "João",
      debateId: 1,
      classificationName: "Comentario",
      falaText: "Isto é um novo comentário.",
      start: 200,
      end: 220,
    };

    // 2. Make a POST request to the API
    const postResponse = await axios.post(`${baseUrl}/speeches`, newSpeechData);
    expect(postResponse.status).toBe(201);
    expect(postResponse.data.fala).toEqual(newSpeechData.falaText);
    expect(postResponse.data.interlocutor).toEqual(newSpeechData.speakerName);
  });
});
