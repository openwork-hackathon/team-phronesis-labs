// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ReputationRegistry.sol";

/**
 * @title SkillEndorsement
 * @notice Skill-specific endorsement system for agents
 * @dev Allows agents to endorse each other's specific skills with weighted trust
 */
contract SkillEndorsement {
    
    // ============ Structs ============
    
    struct SkillEntry {
        string name;
        uint256 endorsementCount;
        uint256 weightedScore;
        bool exists;
    }
    
    struct Endorsement {
        address endorser;
        uint256 weight;
        uint256 timestamp;
        string comment;
    }
    
    // ============ State ============
    
    // Reference to reputation registry
    ReputationRegistry public immutable registry;
    
    // Agent => Skill name => SkillEntry
    mapping(address => mapping(string => SkillEntry)) public agentSkills;
    
    // Agent => List of skill names
    mapping(address => string[]) public agentSkillList;
    
    // Agent => Skill => Endorsements
    mapping(address => mapping(string => Endorsement[])) public skillEndorsements;
    
    // Track who endorsed whom for what (prevents double endorsement)
    // endorser => agent => skill => endorsed
    mapping(address => mapping(address => mapping(string => bool))) public hasEndorsed;
    
    // Standard skill categories
    string[] public standardSkills = [
        "coding",
        "frontend",
        "backend",
        "contract",
        "research",
        "writing",
        "design",
        "trading",
        "automation",
        "pm"
    ];
    
    // ============ Events ============
    
    event SkillAdded(address indexed agent, string skill);
    event SkillEndorsed(
        address indexed agent, 
        string indexed skill, 
        address indexed endorser, 
        uint256 weight
    );
    
    // ============ Constructor ============
    
    constructor(address _registry) {
        registry = ReputationRegistry(_registry);
    }
    
    // ============ Modifiers ============
    
    modifier onlyRegisteredAgent() {
        require(registry.isRegistered(msg.sender), "Not a registered agent");
        _;
    }
    
    // ============ Skill Management ============
    
    /**
     * @notice Add a skill to your profile
     * @param skill Skill name (use standard skills when possible)
     */
    function addSkill(string calldata skill) external onlyRegisteredAgent {
        require(bytes(skill).length > 0 && bytes(skill).length <= 32, "Invalid skill name");
        require(!agentSkills[msg.sender][skill].exists, "Skill already added");
        
        agentSkills[msg.sender][skill] = SkillEntry({
            name: skill,
            endorsementCount: 0,
            weightedScore: 0,
            exists: true
        });
        
        agentSkillList[msg.sender].push(skill);
        emit SkillAdded(msg.sender, skill);
    }
    
    /**
     * @notice Add multiple skills at once
     */
    function addSkills(string[] calldata skills) external onlyRegisteredAgent {
        for (uint256 i = 0; i < skills.length; i++) {
            if (!agentSkills[msg.sender][skills[i]].exists && bytes(skills[i]).length > 0) {
                agentSkills[msg.sender][skills[i]] = SkillEntry({
                    name: skills[i],
                    endorsementCount: 0,
                    weightedScore: 0,
                    exists: true
                });
                agentSkillList[msg.sender].push(skills[i]);
                emit SkillAdded(msg.sender, skills[i]);
            }
        }
    }
    
    // ============ Endorsement Functions ============
    
    /**
     * @notice Endorse an agent's skill
     * @param agent Agent to endorse
     * @param skill Skill to endorse
     * @param comment Optional endorsement comment
     */
    function endorseSkill(
        address agent, 
        string calldata skill,
        string calldata comment
    ) external onlyRegisteredAgent {
        require(agent != msg.sender, "Cannot endorse yourself");
        require(registry.isRegistered(agent), "Target not registered");
        require(agentSkills[agent][skill].exists, "Agent doesn't have this skill");
        require(!hasEndorsed[msg.sender][agent][skill], "Already endorsed this skill");
        
        // Calculate endorsement weight based on endorser's reputation
        uint256 endorserRep = registry.getReputation(msg.sender);
        uint256 weight = endorserRep > 0 ? endorserRep : 1;
        
        // Bonus weight if endorser also has this skill with high score
        if (agentSkills[msg.sender][skill].exists) {
            uint256 endorserSkillScore = agentSkills[msg.sender][skill].weightedScore;
            if (endorserSkillScore > 10) {
                weight = weight * 150 / 100; // 50% bonus
            }
        }
        
        // Record endorsement
        Endorsement memory endorsement = Endorsement({
            endorser: msg.sender,
            weight: weight,
            timestamp: block.timestamp,
            comment: comment
        });
        
        skillEndorsements[agent][skill].push(endorsement);
        hasEndorsed[msg.sender][agent][skill] = true;
        
        // Update skill entry
        agentSkills[agent][skill].endorsementCount++;
        agentSkills[agent][skill].weightedScore += weight;
        
        emit SkillEndorsed(agent, skill, msg.sender, weight);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get all skills for an agent
     */
    function getAgentSkills(address agent) external view returns (string[] memory) {
        return agentSkillList[agent];
    }
    
    /**
     * @notice Get skill details
     */
    function getSkillDetails(
        address agent, 
        string calldata skill
    ) external view returns (SkillEntry memory) {
        return agentSkills[agent][skill];
    }
    
    /**
     * @notice Get endorsements for a skill
     */
    function getSkillEndorsements(
        address agent,
        string calldata skill
    ) external view returns (Endorsement[] memory) {
        return skillEndorsements[agent][skill];
    }
    
    /**
     * @notice Get skill score (weighted endorsements)
     */
    function getSkillScore(
        address agent,
        string calldata skill
    ) external view returns (uint256) {
        return agentSkills[agent][skill].weightedScore;
    }
    
    /**
     * @notice Check if an agent has a verified skill (endorsement threshold)
     * @param agent Agent to check
     * @param skill Skill to verify
     * @param threshold Minimum weighted score required
     */
    function hasVerifiedSkill(
        address agent,
        string calldata skill,
        uint256 threshold
    ) external view returns (bool) {
        return agentSkills[agent][skill].exists && 
               agentSkills[agent][skill].weightedScore >= threshold;
    }
    
    /**
     * @notice Get agents with a specific skill above threshold
     * @dev Gas-intensive, use off-chain indexing for production
     */
    function getStandardSkills() external view returns (string[] memory) {
        return standardSkills;
    }
    
    /**
     * @notice Get total endorsement count for an agent across all skills
     */
    function getTotalEndorsements(address agent) external view returns (uint256) {
        uint256 total = 0;
        string[] memory skills = agentSkillList[agent];
        for (uint256 i = 0; i < skills.length; i++) {
            total += agentSkills[agent][skills[i]].endorsementCount;
        }
        return total;
    }
}
