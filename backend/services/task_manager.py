"""
Task Manager Service
Manages ATC tasks with deduplication, expiration, and persistence
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from task_models import Task, TaskPriority, TaskCategory, TaskStatus, TaskList


class TaskManager:
    """
    Manages tasks with intelligent deduplication and auto-expiration
    """

    def __init__(self, storage_path: str = "data/tasks.json", expiry_minutes: int = 10):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(exist_ok=True)
        self.expiry_minutes = expiry_minutes

        # In-memory task store
        self.tasks: Dict[str, Task] = {}

        # Load existing tasks
        self._load_tasks()

    def _load_tasks(self):
        """Load tasks from JSON file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r') as f:
                    data = json.load(f)
                    for task_dict in data.get('tasks', []):
                        task = Task(**task_dict)
                        self.tasks[task.id] = task
                print(f"📋 Loaded {len(self.tasks)} tasks from storage")
            except Exception as e:
                print(f"⚠️  Error loading tasks: {e}")
                self.tasks = {}

    def _save_tasks(self):
        """Save tasks to JSON file"""
        try:
            task_list = TaskList(
                tasks=list(self.tasks.values()),
                active_count=sum(1 for t in self.tasks.values() if t.status == TaskStatus.ACTIVE),
                high_priority_count=sum(1 for t in self.tasks.values() if t.priority == TaskPriority.HIGH and t.status == TaskStatus.ACTIVE),
                medium_priority_count=sum(1 for t in self.tasks.values() if t.priority == TaskPriority.MEDIUM and t.status == TaskStatus.ACTIVE),
                low_priority_count=sum(1 for t in self.tasks.values() if t.priority == TaskPriority.LOW and t.status == TaskStatus.ACTIVE)
            )

            with open(self.storage_path, 'w') as f:
                json.dump(task_list.dict(), f, indent=2, default=str)
        except Exception as e:
            print(f"⚠️  Error saving tasks: {e}")

    def create_or_update_task(
        self,
        aircraft_icao24: str,
        aircraft_callsign: str,
        priority: TaskPriority,
        category: TaskCategory,
        summary: str,
        description: str,
        ai_action: Optional[str] = None,
        pilot_message: Optional[str] = None,
        alert_id: Optional[str] = None,
        action_id: Optional[str] = None
    ) -> Task:
        """
        Create new task or update existing with same fingerprint

        Deduplication logic:
        - Fingerprint = icao24 + category + priority
        - If task exists with same fingerprint → update last_seen
        - If task doesn't exist → create new task
        """

        # Generate fingerprint for deduplication
        fingerprint = f"{aircraft_icao24}_{category.value}_{priority.value}"

        # Check if task already exists
        existing_task = None
        for task in self.tasks.values():
            if task.fingerprint == fingerprint and task.status == TaskStatus.ACTIVE:
                existing_task = task
                break

        if existing_task:
            # Update existing task
            existing_task.last_seen = datetime.now()
            existing_task.description = description  # Update with latest info
            existing_task.summary = summary
            existing_task.ai_action = ai_action or existing_task.ai_action
            existing_task.pilot_message = pilot_message or existing_task.pilot_message

            print(f"📋 Updated task {existing_task.id} (fingerprint: {fingerprint})")
            self._save_tasks()
            return existing_task

        # Create new task
        task_id = f"task_{datetime.now().timestamp()}"
        task = Task(
            id=task_id,
            aircraft_icao24=aircraft_icao24,
            aircraft_callsign=aircraft_callsign,
            priority=priority,
            category=category,
            summary=summary,
            description=description,
            ai_action=ai_action,
            pilot_message=pilot_message,
            fingerprint=fingerprint,
            alert_id=alert_id,
            action_id=action_id
        )

        self.tasks[task_id] = task
        print(f"✅ Created task {task_id}: {summary} (fingerprint: {fingerprint})")

        self._save_tasks()
        return task

    def resolve_task(self, task_id: str) -> bool:
        """
        Mark task as resolved
        """
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.status = TaskStatus.RESOLVED
            task.resolved_at = datetime.now()

            print(f"✓ Resolved task {task_id}")
            self._save_tasks()
            return True
        return False

    def get_active_tasks(self, sort_by_priority: bool = True) -> List[Task]:
        """
        Get all active tasks, optionally sorted by priority
        """
        active_tasks = [
            task for task in self.tasks.values()
            if task.status == TaskStatus.ACTIVE
        ]

        if sort_by_priority:
            # Sort: HIGH → MEDIUM → LOW
            priority_order = {
                TaskPriority.HIGH: 1,
                TaskPriority.MEDIUM: 2,
                TaskPriority.LOW: 3
            }
            active_tasks.sort(key=lambda t: priority_order.get(t.priority, 999))

        return active_tasks

    def get_task(self, task_id: str) -> Optional[Task]:
        """Get specific task by ID"""
        return self.tasks.get(task_id)

    def expire_stale_tasks(self) -> int:
        """
        Expire tasks that haven't been seen in the last N minutes

        Returns:
            Number of tasks expired
        """
        now = datetime.now()
        expiry_threshold = now - timedelta(minutes=self.expiry_minutes)

        expired_count = 0
        for task in list(self.tasks.values()):
            if task.status == TaskStatus.ACTIVE and task.last_seen < expiry_threshold:
                task.status = TaskStatus.EXPIRED
                expired_count += 1
                print(f"⏱️  Expired task {task.id} (not seen for {self.expiry_minutes} min)")

        if expired_count > 0:
            self._save_tasks()

        return expired_count

    def cleanup_old_tasks(self, hours: int = 24) -> int:
        """
        Remove resolved/expired tasks older than N hours

        Returns:
            Number of tasks cleaned up
        """
        now = datetime.now()
        cleanup_threshold = now - timedelta(hours=hours)

        tasks_to_remove = []
        for task_id, task in self.tasks.items():
            if task.status != TaskStatus.ACTIVE:
                # Check resolved_at or last_seen
                check_time = task.resolved_at or task.last_seen
                if check_time < cleanup_threshold:
                    tasks_to_remove.append(task_id)

        for task_id in tasks_to_remove:
            del self.tasks[task_id]

        if tasks_to_remove:
            print(f"🧹 Cleaned up {len(tasks_to_remove)} old tasks")
            self._save_tasks()

        return len(tasks_to_remove)

    def get_statistics(self) -> Dict:
        """Get task statistics"""
        active = self.get_active_tasks()
        return {
            "total_tasks": len(self.tasks),
            "active_tasks": len(active),
            "high_priority": sum(1 for t in active if t.priority == TaskPriority.HIGH),
            "medium_priority": sum(1 for t in active if t.priority == TaskPriority.MEDIUM),
            "low_priority": sum(1 for t in active if t.priority == TaskPriority.LOW),
            "resolved_tasks": sum(1 for t in self.tasks.values() if t.status == TaskStatus.RESOLVED),
            "expired_tasks": sum(1 for t in self.tasks.values() if t.status == TaskStatus.EXPIRED),
        }


# Global task manager instance
task_manager = TaskManager()
