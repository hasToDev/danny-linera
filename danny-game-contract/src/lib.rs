use async_graphql::{Request, Response};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ChainId, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

pub struct DannyGameAbi;

impl ContractAbi for DannyGameAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for DannyGameAbi {
    type Query = Request;
    type QueryResponse = Response;
}

// Application parameters - можуть бути встановлені після деплою
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ApplicationParameters {
    pub leaderboard_chain_id: Option<ChainId>,
}

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    // Сумісність з flappy - збільшити поточний рахунок
    Increment {
        value: u64,
    },
    // Встановити найкращий результат та відправити
    SetBestAndSubmit {
        best: u64,
    },
    RequestLeaderboard,
    // Setup операція для налаштування гри (працює тільки один раз)
    SetupGame {
        leaderboard_chain_id: ChainId,
        player_name: String,
    },
}

// Типи повідомлень для міжланцюжкового спілкування
#[derive(Debug, Deserialize, Serialize)]
pub enum DannyGameMessage {
    // Від ланцюжка гравця до центрального ланцюжка
    SubmitScore {
        player_name: String,
        score: u64,
        chain_id: ChainId,
    },
    // Запит лідерборду від центрального ланцюжка
    RequestLeaderboard {
        requester_chain_id: ChainId,
    },
    // Відповідь від центрального ланцюжка
    LeaderboardUpdate {
        entries: Vec<LeaderboardEntry>,
    },
}

// Структура запису лідерборду
#[derive(Debug, Clone, Deserialize, Serialize, async_graphql::SimpleObject)]
pub struct LeaderboardEntry {
    pub player_name: String,
    pub score: u64,
    pub chain_id: ChainId,
    pub timestamp: u64,
} 