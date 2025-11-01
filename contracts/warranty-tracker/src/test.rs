#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _, testutils::Ledger, testutils::LedgerInfo, Address, Env, String,
};

#[test]
fn test_register_warranty() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 86400; // 1 day after base
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let product_name = String::from_str(&env, "Laptop");
    let serial_number = String::from_str(&env, "SN123456");
    let manufacturer = String::from_str(&env, "TechCorp");
    let purchase_date = base_timestamp;
    let expiration_date = current_time + 31536000; // 1 year from current

    env.mock_all_auths();
    let warranty_id = client.register_warranty(
        &owner,
        &product_name,
        &serial_number,
        &manufacturer,
        &purchase_date,
        &expiration_date,
    );

    assert_eq!(warranty_id, 1);

    let count = client.get_warranty_count();
    assert_eq!(count, 1);

    let warranty = client.get_warranty(&warranty_id).unwrap();
    assert_eq!(warranty.id, 1);
    assert_eq!(warranty.owner, owner);
    assert_eq!(warranty.product_name, product_name);
    assert_eq!(warranty.serial_number, serial_number);
    assert_eq!(warranty.manufacturer, manufacturer);
    assert_eq!(warranty.status, WarrantyStatus::Active);
}

#[test]
fn test_get_warranties_by_owner() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 86400;
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let purchase_date = base_timestamp;
    let expiration_date = current_time + 31536000;

    env.mock_all_auths();

    let warranty1_id = client.register_warranty(
        &owner1,
        &String::from_str(&env, "Product1"),
        &String::from_str(&env, "SN1"),
        &String::from_str(&env, "Manufacturer1"),
        &purchase_date,
        &expiration_date,
    );

    let warranty2_id = client.register_warranty(
        &owner1,
        &String::from_str(&env, "Product2"),
        &String::from_str(&env, "SN2"),
        &String::from_str(&env, "Manufacturer2"),
        &purchase_date,
        &expiration_date,
    );

    let warranty3_id = client.register_warranty(
        &owner2,
        &String::from_str(&env, "Product3"),
        &String::from_str(&env, "SN3"),
        &String::from_str(&env, "Manufacturer3"),
        &purchase_date,
        &expiration_date,
    );

    let owner1_warranties = client.get_warranties_by_owner(&owner1);
    assert_eq!(owner1_warranties.len(), 2);
    assert!(owner1_warranties.contains(&warranty1_id));
    assert!(owner1_warranties.contains(&warranty2_id));

    let owner2_warranties = client.get_warranties_by_owner(&owner2);
    assert_eq!(owner2_warranties.len(), 1);
    assert_eq!(owner2_warranties.get(0).unwrap(), warranty3_id);
}

#[test]
fn test_update_status() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 86400;
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let purchase_date = base_timestamp;
    let expiration_date = current_time + 31536000;

    env.mock_all_auths();

    let warranty_id = client.register_warranty(
        &owner,
        &String::from_str(&env, "Product"),
        &String::from_str(&env, "SN123"),
        &String::from_str(&env, "Manufacturer"),
        &purchase_date,
        &expiration_date,
    );

    let warranty = client.get_warranty(&warranty_id).unwrap();
    assert_eq!(warranty.status, WarrantyStatus::Active);

    client.update_status(&warranty_id, &WarrantyStatus::Revoked);

    let warranty = client.get_warranty(&warranty_id).unwrap();
    assert_eq!(warranty.status, WarrantyStatus::Revoked);
}

#[test]
fn test_transfer_ownership() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 86400;
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let purchase_date = base_timestamp;
    let expiration_date = current_time + 31536000;

    env.mock_all_auths();

    let warranty_id = client.register_warranty(
        &owner1,
        &String::from_str(&env, "Product"),
        &String::from_str(&env, "SN123"),
        &String::from_str(&env, "Manufacturer"),
        &purchase_date,
        &expiration_date,
    );

    let owner1_warranties = client.get_warranties_by_owner(&owner1);
    assert_eq!(owner1_warranties.len(), 1);

    client.transfer_ownership(&warranty_id, &owner2);

    let warranty = client.get_warranty(&warranty_id).unwrap();
    assert_eq!(warranty.owner, owner2);

    let owner1_warranties_after = client.get_warranties_by_owner(&owner1);
    assert_eq!(owner1_warranties_after.len(), 0);

    let owner2_warranties = client.get_warranties_by_owner(&owner2);
    assert_eq!(owner2_warranties.len(), 1);
    assert_eq!(owner2_warranties.get(0).unwrap(), warranty_id);
}

#[test]
#[should_panic(expected = "cannot transfer non-active warranty")]
fn test_transfer_revoked_warranty() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 86400;
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let purchase_date = base_timestamp;
    let expiration_date = current_time + 31536000;

    env.mock_all_auths();

    let warranty_id = client.register_warranty(
        &owner1,
        &String::from_str(&env, "Product"),
        &String::from_str(&env, "SN123"),
        &String::from_str(&env, "Manufacturer"),
        &purchase_date,
        &expiration_date,
    );

    client.revoke_warranty(&warranty_id);

    client.transfer_ownership(&warranty_id, &owner2);
}

#[test]
fn test_revoke_warranty() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 86400;
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let purchase_date = base_timestamp;
    let expiration_date = current_time + 31536000;

    env.mock_all_auths();

    let warranty_id = client.register_warranty(
        &owner,
        &String::from_str(&env, "Product"),
        &String::from_str(&env, "SN123"),
        &String::from_str(&env, "Manufacturer"),
        &purchase_date,
        &expiration_date,
    );

    client.revoke_warranty(&warranty_id);

    let warranty = client.get_warranty(&warranty_id).unwrap();
    assert_eq!(warranty.status, WarrantyStatus::Revoked);
}

#[test]
fn test_is_warranty_expired() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 31536000; // 1 year after base
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let expired_purchase = base_timestamp;
    let expired_expiration = base_timestamp + 86400;
    let active_purchase = base_timestamp;
    let active_expiration = current_time + 31536000;

    env.mock_all_auths();

    let expired_warranty_id = client.register_warranty(
        &owner,
        &String::from_str(&env, "OldProduct"),
        &String::from_str(&env, "SN1"),
        &String::from_str(&env, "Manufacturer"),
        &expired_purchase,
        &expired_expiration,
    );

    let active_warranty_id = client.register_warranty(
        &owner,
        &String::from_str(&env, "NewProduct"),
        &String::from_str(&env, "SN2"),
        &String::from_str(&env, "Manufacturer"),
        &active_purchase,
        &active_expiration,
    );

    assert!(client.is_warranty_expired(&expired_warranty_id));
    assert!(!client.is_warranty_expired(&active_warranty_id));
}

#[test]
#[should_panic(expected = "expiration_date must be after purchase_date")]
fn test_register_warranty_invalid_dates() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    env.ledger().set(LedgerInfo {
        timestamp: base_timestamp + 259200,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let purchase_date = base_timestamp + 172800;
    let expiration_date = base_timestamp + 86400;

    env.mock_all_auths();

    client.register_warranty(
        &owner,
        &String::from_str(&env, "Product"),
        &String::from_str(&env, "SN123"),
        &String::from_str(&env, "Manufacturer"),
        &purchase_date,
        &expiration_date,
    );
}

#[test]
fn test_register_expired_warranty() {
    let env = Env::default();
    let base_timestamp: u64 = 1704067200;
    let current_time = base_timestamp + 31536000; // 1 year after base
    env.ledger().set(LedgerInfo {
        timestamp: current_time,
        protocol_version: 23,
        sequence_number: 0,
        network_id: [0; 32],
        base_reserve: 1000000,
        max_entry_ttl: 86400 * 365 * 10,      // 10 years
        min_persistent_entry_ttl: 86400 * 30, // 30 days
        min_temp_entry_ttl: 86400 * 7,        // 7 days
    });

    let contract_id = env.register(WarrantyTracker, ());
    let client = WarrantyTrackerClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let purchase_date = base_timestamp;
    let expiration_date = base_timestamp + 86400;

    env.mock_all_auths();

    let warranty_id = client.register_warranty(
        &owner,
        &String::from_str(&env, "OldProduct"),
        &String::from_str(&env, "SN123"),
        &String::from_str(&env, "Manufacturer"),
        &purchase_date,
        &expiration_date,
    );

    let warranty = client.get_warranty(&warranty_id).unwrap();
    assert_eq!(warranty.status, WarrantyStatus::Expired);
}
