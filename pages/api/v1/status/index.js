async function status(request, response) {
  response.status(200).json({ teste: "valor" });
}

export default status;
