use async_graphql::{Request, Response};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{ContractAbi, ServiceAbi, ChainId},
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

// Спрощені параметри додатку
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ApplicationParameters {
    pub leaderboard_chain_id: Option<ChainId>,
}

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum Operation {
    // Збільшити поточний рахунок
    Increment {
        value: u64,
    },
    // Встановити найкращий результат та надіслати до лідерборду
    SetBest {
        best: u64,
    },
    // Встановити ім'я гравця
    SetPlayerName {
        name: String,
    },
    // Налаштувати ID ланцюжка лідерборду
    SetLeaderboardChain {
        chain_id: ChainId,
    },
    // Запросити оновлення лідерборду
    RequestLeaderboard,
    // Комбінована операція налаштування як у Flappy
    SetupGame {
        leaderboard_chain_id: ChainId,
        player_name: String,
    },
    // Комбінована операція для встановлення і відправлення результату
    SetBestAndSubmit {
        best: u64,
    },
}

// Міжланцюгові повідомлення
#[derive(Debug, Deserialize, Serialize)]
pub enum DannyGameMessage {
    // Надіслати результат до лідерборду
    SubmitScore {
        player_name: String,
        score: u64,
        player_chain_id: ChainId,
    },
    // Запросити лідерборд
    RequestLeaderboard {
        requester_chain_id: ChainId,
    },
    // Відповідь з лідербордом
    LeaderboardResponse {
        leaderboard: Vec<LeaderboardEntry>,
    },
}

// Структура запису лідерборду
#[derive(Debug, Clone, Deserialize, Serialize, async_graphql::SimpleObject)]
pub struct LeaderboardEntry {
    pub player_name: String,
    pub score: u64,
    pub timestamp: u64,
    pub player_chain_id: ChainId,
} 