SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;


CREATE TABLE IF NOT EXISTS `pms_activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_code` varchar(20) NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=300 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_hour_control` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) DEFAULT NULL,
  `user_code` varchar(20) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `task_description` text NOT NULL,
  `hours_worked` decimal(5,2) NOT NULL,
  `date_begin` datetime DEFAULT NULL,
  `date_closure` datetime DEFAULT NULL,
  `requested_by` varchar(255) NOT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `image_path` varchar(255) DEFAULT NULL,
  `extralaboral` varchar(3) DEFAULT 'No',
  `reason` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_internal_controls` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requirement` varchar(255) DEFAULT NULL,
  `classifier` varchar(100) DEFAULT NULL,
  `subclassifier` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `floor` varchar(50) DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `priority` int(11) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `applicant` varchar(50) DEFAULT NULL,
  `responsible_ti` varchar(50) DEFAULT NULL,
  `approximate_end_date` datetime DEFAULT NULL,
  `progress_percentage` int(11) DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `iframe` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `detail` text DEFAULT NULL,
  `risk` varchar(1000) DEFAULT NULL,
  `consequence` varchar(1000) DEFAULT NULL,
  `classifier` varchar(100) DEFAULT NULL,
  `subclassifier` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `floor` int(11) DEFAULT NULL,
  `priority` varchar(50) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `applicant` varchar(50) DEFAULT NULL,
  `responsible` varchar(1000) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `pause_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `progress_percentage` int(11) DEFAULT NULL,
  `prod` varchar(10) DEFAULT '0',
  `observations` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=190 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_project_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` int(10) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_project_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `ascinsa_code` varchar(50) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `pms_project_comments_ibfk_1` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_code` varchar(20) DEFAULT NULL,
  `report_date` date NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `priority` varchar(255) NOT NULL,
  `due_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `responsible` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `pms_tasks_ibfk_1` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pms_task_hours` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_code` varchar(20) NOT NULL,
  `task_id` int(11) NOT NULL,
  `hour_start` datetime NOT NULL,
  `hour_end` datetime NOT NULL,
  `hours_taken` decimal(5,2) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


ALTER TABLE `pms_project_attachments`
  ADD CONSTRAINT `pms_project_attachments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `pms_projects` (`id`);

ALTER TABLE `pms_project_comments`
  ADD CONSTRAINT `pms_project_comments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `pms_projects` (`id`) ON DELETE CASCADE;

ALTER TABLE `pms_tasks`
  ADD CONSTRAINT `pms_tasks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `pms_projects` (`id`) ON DELETE CASCADE;

ALTER TABLE `pms_task_hours`
  ADD CONSTRAINT `pms_task_hours_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `pms_tasks` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
