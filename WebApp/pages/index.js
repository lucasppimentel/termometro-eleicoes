import React from "react";
import Layout from "../components/Layout";
import DebateFilterBar from "../components/DebateFilterBar";
import DebateGrid from "../components/DebateGrid";
import useDebates from "../components/useDebates";

// Removed bgStyle and meshNoise

const HomePage = () => {
  const {
    debates,
    loading,
    error,
    search,
    setSearch,
    date,
    setDate,
    participant,
    setParticipant,
    participantsOptions,
  } = useDebates();

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-xl text-[#1351B4] font-semibold">Carregando lista de debates...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="p-8 text-center text-red-600 bg-red-100 border border-red-300 rounded-sm max-w-lg mx-auto">
            Erro: {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[]}>
      {/* Header for Home Page */}
      <header className="w-full bg-gray-100 border-b border-gray-300 py-6 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-2">Repositório Público de Debates</h1>
          <p className="mt-2 text-lg text-gray-700 font-medium">
            Explore os debates políticos recentes e suas discussões detalhadas.
          </p>
        </div>
      </header>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DebateFilterBar
          search={search}
          onSearchChange={setSearch}
          date={date}
          onDateChange={setDate}
          participant={participant}
          onParticipantChange={setParticipant}
          participantsOptions={participantsOptions}
        />
        <div className="mt-8">
          <DebateGrid debates={debates} />
        </div>
        <div className="text-center mt-10 p-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-sm max-w-3xl mx-auto">
          <p className="text-base">
            A relevância média reflete a nota média (1.0 a 5.0) dada às respostas do debate.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;