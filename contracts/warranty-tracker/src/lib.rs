#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Vec};

#[contract]
pub struct WarrantyTracker;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WarrantyData {
    pub id: u64,
    pub owner: Address,
    pub product_name: String,
    pub serial_number: String,
    pub manufacturer: String,
    pub purchase_date: u64,
    pub expiration_date: u64,
    pub status: WarrantyStatus,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum WarrantyStatus {
    Active,
    Expired,
    Revoked,
}

#[contracttype]
pub enum DataKey {
    WarrantyData,
    WarrantyIds,
    OwnerWarranties(Address),
    WarrantyCount,
}

#[contractimpl]
impl WarrantyTracker {
    /// Register a new warranty
    ///
    /// # Arguments
    /// - `env`: The environment
    /// - `owner`: The address that owns this warranty
    /// - `product_name`: Name of the product
    /// - `serial_number`: Serial number of the product
    /// - `manufacturer`: Manufacturer name
    /// - `purchase_date`: Purchase date as Unix timestamp
    /// - `expiration_date`: Warranty expiration date as Unix timestamp
    ///
    /// # Returns
    /// The warranty ID
    pub fn register_warranty(
        env: Env,
        owner: Address,
        product_name: String,
        serial_number: String,
        manufacturer: String,
        purchase_date: u64,
        expiration_date: u64,
    ) -> u64 {
        owner.require_auth();

        if expiration_date <= purchase_date {
            panic!("expiration_date must be after purchase_date");
        }

        let current_time = env.ledger().timestamp();
        if purchase_date > current_time {
            panic!("purchase_date cannot be in the future");
        }

        let warranty_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::WarrantyCount)
            .unwrap_or(0);

        let warranty_id = warranty_count + 1;

        let status = if expiration_date < current_time {
            WarrantyStatus::Expired
        } else {
            WarrantyStatus::Active
        };

        let warranty = WarrantyData {
            id: warranty_id,
            owner: owner.clone(),
            product_name,
            serial_number,
            manufacturer,
            purchase_date,
            expiration_date,
            status,
            created_at: current_time,
        };

        let mut warranty_map: Map<u64, WarrantyData> = env
            .storage()
            .instance()
            .get(&DataKey::WarrantyData)
            .unwrap_or(Map::new(&env));
        warranty_map.set(warranty_id, warranty.clone());
        env.storage()
            .instance()
            .set(&DataKey::WarrantyData, &warranty_map);

        let mut warranty_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::WarrantyIds)
            .unwrap_or(Vec::new(&env));
        warranty_ids.push_back(warranty_id);
        env.storage()
            .instance()
            .set(&DataKey::WarrantyIds, &warranty_ids);

        let owner_key = DataKey::OwnerWarranties(owner.clone());
        let mut owner_warranties: Vec<u64> = env
            .storage()
            .instance()
            .get(&owner_key)
            .unwrap_or(Vec::new(&env));
        owner_warranties.push_back(warranty_id);
        env.storage().instance().set(&owner_key, &owner_warranties);

        env.storage()
            .instance()
            .set(&DataKey::WarrantyCount, &warranty_id);

        warranty_id
    }

    /// Get warranty details by ID
    ///
    /// # Arguments
    /// - `env`: The environment
    /// - `warranty_id`: The warranty ID to query
    ///
    /// # Returns
    /// The warranty details or None if not found
    pub fn get_warranty(env: Env, warranty_id: u64) -> Option<WarrantyData> {
        let warranty_map: Map<u64, WarrantyData> =
            env.storage().instance().get(&DataKey::WarrantyData)?;
        warranty_map.get(warranty_id)
    }

    /// Update warranty status (can expire warranties or revoke them)
    ///
    /// # Arguments
    /// - `env`: The environment
    /// - `warranty_id`: The warranty ID to update
    /// - `status`: The new status
    pub fn update_status(env: Env, warranty_id: u64, status: WarrantyStatus) {
        let mut warranty_map: Map<u64, WarrantyData> = env
            .storage()
            .instance()
            .get(&DataKey::WarrantyData)
            .expect("warranty storage not initialized");

        let mut warranty: WarrantyData = warranty_map.get(warranty_id).expect("warranty not found");

        warranty.owner.require_auth();

        warranty.status = status;
        warranty_map.set(warranty_id, warranty.clone());
        env.storage()
            .instance()
            .set(&DataKey::WarrantyData, &warranty_map);
    }

    /// Transfer warranty ownership to another address
    ///
    /// # Arguments
    /// - `env`: The environment
    /// - `warranty_id`: The warranty ID to transfer
    /// - `new_owner`: The new owner address
    pub fn transfer_ownership(env: Env, warranty_id: u64, new_owner: Address) {
        let mut warranty_map: Map<u64, WarrantyData> = env
            .storage()
            .instance()
            .get(&DataKey::WarrantyData)
            .expect("warranty storage not initialized");

        let mut warranty: WarrantyData = warranty_map.get(warranty_id).expect("warranty not found");

        warranty.owner.require_auth();

        if warranty.status != WarrantyStatus::Active {
            panic!("cannot transfer non-active warranty");
        }

        let old_owner = warranty.owner.clone();
        warranty.owner = new_owner.clone();

        warranty_map.set(warranty_id, warranty.clone());
        env.storage()
            .instance()
            .set(&DataKey::WarrantyData, &warranty_map);

        let old_owner_key = DataKey::OwnerWarranties(old_owner.clone());
        let old_owner_warranties: Vec<u64> = env
            .storage()
            .instance()
            .get(&old_owner_key)
            .unwrap_or(Vec::new(&env));

        let mut new_old_list = Vec::new(&env);
        for i in 0..old_owner_warranties.len() {
            if old_owner_warranties.get(i).unwrap() != warranty_id {
                new_old_list.push_back(old_owner_warranties.get(i).unwrap());
            }
        }
        env.storage().instance().set(&old_owner_key, &new_old_list);

        let new_owner_key = DataKey::OwnerWarranties(new_owner.clone());
        let mut new_owner_warranties: Vec<u64> = env
            .storage()
            .instance()
            .get(&new_owner_key)
            .unwrap_or(Vec::new(&env));
        new_owner_warranties.push_back(warranty_id);
        env.storage()
            .instance()
            .set(&new_owner_key, &new_owner_warranties);
    }

    /// Revoke a warranty (only owner can revoke)
    ///
    /// # Arguments
    /// - `env`: The environment
    /// - `warranty_id`: The warranty ID to revoke
    pub fn revoke_warranty(env: Env, warranty_id: u64) {
        let mut warranty_map: Map<u64, WarrantyData> = env
            .storage()
            .instance()
            .get(&DataKey::WarrantyData)
            .expect("warranty storage not initialized");

        let mut warranty: WarrantyData = warranty_map.get(warranty_id).expect("warranty not found");

        warranty.owner.require_auth();

        warranty.status = WarrantyStatus::Revoked;
        warranty_map.set(warranty_id, warranty.clone());
        env.storage()
            .instance()
            .set(&DataKey::WarrantyData, &warranty_map);
    }

    /// Get all warranty IDs for a specific owner
    ///
    /// # Arguments
    /// - `env`: The environment
    /// - `owner`: The owner address
    ///
    /// # Returns
    /// Vector of warranty IDs owned by the address
    pub fn get_warranties_by_owner(env: Env, owner: Address) -> Vec<u64> {
        let owner_key = DataKey::OwnerWarranties(owner);
        env.storage()
            .instance()
            .get(&owner_key)
            .unwrap_or(Vec::new(&env))
    }

    /// Get total number of registered warranties
    ///
    /// # Arguments
    /// - `env`: The environment
    ///
    /// # Returns
    /// Total warranty count
    pub fn get_warranty_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::WarrantyCount)
            .unwrap_or(0)
    }

    /// Check if a warranty is expired based on current time
    ///
    /// # Arguments
    /// - `env`: The environment
    /// - `warranty_id`: The warranty ID to check
    ///
    /// # Returns
    /// true if warranty is expired
    pub fn is_warranty_expired(env: Env, warranty_id: u64) -> bool {
        let warranty_map: Map<u64, WarrantyData> = env
            .storage()
            .instance()
            .get(&DataKey::WarrantyData)
            .expect("warranty storage not initialized");

        let warranty: WarrantyData = warranty_map.get(warranty_id).expect("warranty not found");

        let current_time = env.ledger().timestamp();
        warranty.expiration_date < current_time
    }
}

mod test;
