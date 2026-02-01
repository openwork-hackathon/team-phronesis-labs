// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReputationRegistry
 * @notice Decentralized reputation system for the agent economy
 * @dev Stores and manages portable reputation scores that work across platforms
 */
contract ReputationRegistry is Ownable, ReentrancyGuard {
    
    // ============ Structs ============
    
    struct AgentProfile {
        address wallet;
        string name;
        uint256 reputation;
        uint256 jobsCompleted;
        uint256 jobsFailed;
        uint256 endorsementsReceived;
        uint256 endorsementsGiven;
        uint256 registeredAt;
        bool isActive;
    }
    
    struct JobRecord {
        bytes32 jobId;
        address agent;
        address client;
        address platform;
        uint256 reward;
        uint8 rating; // 1-5
        bool completed;
        uint256 timestamp;
    }
    
    // ============ State ============
    
    // Agent address => Profile
    mapping(address => AgentProfile) public agents;
    
    // Agent address => Job records
    mapping(address => JobRecord[]) public jobHistory;
    
    // Trusted platforms that can report job completions
    mapping(address => bool) public trustedPlatforms;
    
    // Total registered agents
    uint256 public totalAgents;
    
    // Reputation calculation weights (out of 100)
    uint256 public constant WEIGHT_JOBS = 40;
    uint256 public constant WEIGHT_RATING = 35;
    uint256 public constant WEIGHT_ENDORSEMENTS = 25;
    
    // ============ Events ============
    
    event AgentRegistered(address indexed agent, string name, uint256 timestamp);
    event JobCompleted(address indexed agent, bytes32 indexed jobId, address platform, uint8 rating);
    event JobFailed(address indexed agent, bytes32 indexed jobId, address platform);
    event ReputationUpdated(address indexed agent, uint256 oldScore, uint256 newScore);
    event PlatformTrusted(address indexed platform, bool trusted);
    event EndorsementReceived(address indexed agent, address indexed endorser, uint256 weight);
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ Agent Registration ============
    
    /**
     * @notice Register a new agent
     * @param name Human-readable agent name
     */
    function registerAgent(string calldata name) external {
        require(!agents[msg.sender].isActive, "Already registered");
        require(bytes(name).length > 0 && bytes(name).length <= 64, "Invalid name");
        
        agents[msg.sender] = AgentProfile({
            wallet: msg.sender,
            name: name,
            reputation: 100, // Start with base reputation
            jobsCompleted: 0,
            jobsFailed: 0,
            endorsementsReceived: 0,
            endorsementsGiven: 0,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        totalAgents++;
        emit AgentRegistered(msg.sender, name, block.timestamp);
    }
    
    // ============ Job Reporting (Platform Functions) ============
    
    /**
     * @notice Report a completed job (called by trusted platform)
     * @param agent Agent who completed the job
     * @param jobId Unique job identifier
     * @param client Client who hired the agent
     * @param reward Job reward in wei
     * @param rating Client rating (1-5)
     */
    function reportJobCompleted(
        address agent,
        bytes32 jobId,
        address client,
        uint256 reward,
        uint8 rating
    ) external {
        require(trustedPlatforms[msg.sender], "Not a trusted platform");
        require(agents[agent].isActive, "Agent not registered");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        
        JobRecord memory record = JobRecord({
            jobId: jobId,
            agent: agent,
            client: client,
            platform: msg.sender,
            reward: reward,
            rating: rating,
            completed: true,
            timestamp: block.timestamp
        });
        
        jobHistory[agent].push(record);
        agents[agent].jobsCompleted++;
        
        uint256 oldRep = agents[agent].reputation;
        _recalculateReputation(agent);
        
        emit JobCompleted(agent, jobId, msg.sender, rating);
        emit ReputationUpdated(agent, oldRep, agents[agent].reputation);
    }
    
    /**
     * @notice Report a failed job (called by trusted platform)
     * @param agent Agent who failed the job
     * @param jobId Unique job identifier
     */
    function reportJobFailed(address agent, bytes32 jobId) external {
        require(trustedPlatforms[msg.sender], "Not a trusted platform");
        require(agents[agent].isActive, "Agent not registered");
        
        JobRecord memory record = JobRecord({
            jobId: jobId,
            agent: agent,
            client: address(0),
            platform: msg.sender,
            reward: 0,
            rating: 0,
            completed: false,
            timestamp: block.timestamp
        });
        
        jobHistory[agent].push(record);
        agents[agent].jobsFailed++;
        
        uint256 oldRep = agents[agent].reputation;
        _recalculateReputation(agent);
        
        emit JobFailed(agent, jobId, msg.sender);
        emit ReputationUpdated(agent, oldRep, agents[agent].reputation);
    }
    
    // ============ Reputation Calculation ============
    
    /**
     * @dev Recalculate reputation based on job history and endorsements
     */
    function _recalculateReputation(address agent) internal {
        AgentProfile storage profile = agents[agent];
        
        uint256 totalJobs = profile.jobsCompleted + profile.jobsFailed;
        if (totalJobs == 0) {
            profile.reputation = 100;
            return;
        }
        
        // Component 1: Job completion rate (0-100)
        uint256 completionScore = (profile.jobsCompleted * 100) / totalJobs;
        
        // Component 2: Average rating (0-100)
        uint256 avgRating = _calculateAverageRating(agent);
        uint256 ratingScore = (avgRating * 100) / 5;
        
        // Component 3: Endorsement score (0-100, capped)
        uint256 endorsementScore = profile.endorsementsReceived > 100 
            ? 100 
            : profile.endorsementsReceived;
        
        // Weighted average
        profile.reputation = (
            (completionScore * WEIGHT_JOBS) +
            (ratingScore * WEIGHT_RATING) +
            (endorsementScore * WEIGHT_ENDORSEMENTS)
        ) / 100;
        
        // Clamp to 0-1000 range
        if (profile.reputation > 1000) {
            profile.reputation = 1000;
        }
    }
    
    /**
     * @dev Calculate average rating from job history
     */
    function _calculateAverageRating(address agent) internal view returns (uint256) {
        JobRecord[] storage history = jobHistory[agent];
        if (history.length == 0) return 3; // Default neutral rating
        
        uint256 totalRating = 0;
        uint256 ratedJobs = 0;
        
        for (uint256 i = 0; i < history.length; i++) {
            if (history[i].completed && history[i].rating > 0) {
                totalRating += history[i].rating;
                ratedJobs++;
            }
        }
        
        return ratedJobs > 0 ? totalRating / ratedJobs : 3;
    }
    
    // ============ Endorsements ============
    
    /**
     * @notice Endorse another agent (adds to their reputation)
     * @param agent Agent to endorse
     */
    function endorseAgent(address agent) external {
        require(agents[msg.sender].isActive, "Must be registered to endorse");
        require(agents[agent].isActive, "Target not registered");
        require(msg.sender != agent, "Cannot endorse yourself");
        
        // Weight endorsement by endorser's reputation
        uint256 weight = agents[msg.sender].reputation / 100;
        if (weight == 0) weight = 1;
        
        agents[agent].endorsementsReceived += weight;
        agents[msg.sender].endorsementsGiven++;
        
        uint256 oldRep = agents[agent].reputation;
        _recalculateReputation(agent);
        
        emit EndorsementReceived(agent, msg.sender, weight);
        emit ReputationUpdated(agent, oldRep, agents[agent].reputation);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add or remove a trusted platform
     */
    function setTrustedPlatform(address platform, bool trusted) external onlyOwner {
        trustedPlatforms[platform] = trusted;
        emit PlatformTrusted(platform, trusted);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get agent reputation score
     */
    function getReputation(address agent) external view returns (uint256) {
        return agents[agent].reputation;
    }
    
    /**
     * @notice Get full agent profile
     */
    function getProfile(address agent) external view returns (AgentProfile memory) {
        return agents[agent];
    }
    
    /**
     * @notice Get agent job history
     */
    function getJobHistory(address agent) external view returns (JobRecord[] memory) {
        return jobHistory[agent];
    }
    
    /**
     * @notice Get job count for an agent
     */
    function getJobCount(address agent) external view returns (uint256 completed, uint256 failed) {
        return (agents[agent].jobsCompleted, agents[agent].jobsFailed);
    }
    
    /**
     * @notice Check if agent is registered
     */
    function isRegistered(address agent) external view returns (bool) {
        return agents[agent].isActive;
    }
}
